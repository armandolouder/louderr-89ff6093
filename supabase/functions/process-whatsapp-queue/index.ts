import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, jsonResponse } from "../_shared/cors.ts";
import { verifyUserJwt } from "../_shared/auth.ts";
 import { sendWhatsAppText, sendWhatsAppMedia, hasWhatsAppCredentials } from "../_shared/whatsapp.ts";
import { digitsOnly } from "../_shared/phone.ts";

interface QueueItem {
  id: string;
  campaign_id: string;
  customer_id: string;
  phone: string;
  content: string;
  status: string;
  metadata: {
    media_url?: string;
    media_type?: string;
  };
  attempts: number;
}

interface Campaign {
  id: string;
  status: string;
  delay_min_seconds: number;
  delay_max_seconds: number;
  daily_limit: number;
  sent_count: number;
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  try {
    // Allow two invocation modes:
    //  1) Manual (frontend) — sends a user JWT in the Authorization header.
    //  2) Cron — sends the anon key; no user context. We still process the
    //     shared queue with the service-role client below.
    const body = await req.json().catch(() => ({} as any));
    const isCron = body?.cron === true || body?.triggered_by === "cron";
    if (!isCron) {
      const authResult = await verifyUserJwt(req);
      if (!authResult.ok) return authResult.response;
    }

     if (!hasWhatsAppCredentials()) throw new Error("WhatsApp credentials not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve owner user_id for multi-tenant data isolation
    const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
    const ownerUserId = ownerData as string | null;

    const { campaignId, limit = 10 } = body;

    // Build query for pending messages
    let query = supabase
      .from("whatsapp_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }

    const { data: queueItems, error: queueError } = await query;

    if (queueError) throw queueError;

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending messages" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${queueItems.length} messages from queue`);

    const results: { id: string; success: boolean; error?: string }[] = [];
    const campaignUpdates: Record<string, { sent: number; failed: number }> = {};

    for (const item of queueItems as QueueItem[]) {
      try {
        // Mark as processing
        await supabase
          .from("whatsapp_queue")
          .update({ 
            status: "processing",
            attempts: item.attempts + 1
          })
          .eq("id", item.id);

        const formattedPhone = digitsOnly(item.phone);
        const hasMedia = item.metadata?.media_url && item.metadata?.media_type && item.metadata.media_type !== "none";

         const apiResult = hasMedia
           ? await sendWhatsAppMedia({
               phone: formattedPhone,
               mediaType: item.metadata.media_type as any,
               fileUrl: item.metadata.media_url!,
               caption: item.content || "",
             })
           : await sendWhatsAppText(formattedPhone, item.content);

         console.log(`WhatsApp API response for ${formattedPhone}: ${apiResult.status}`);
         const responseData = apiResult.data;

         if (apiResult.ok) {
          // Success - update queue and create log
          await supabase
            .from("whatsapp_queue")
            .update({ 
              status: "sent",
              sent_at: new Date().toISOString()
            })
            .eq("id", item.id);

          // Get customer cluster for log
          const { data: customer } = await supabase
            .from("imported_customers")
            .select("cluster_id, customer_clusters(name)")
            .eq("id", item.customer_id)
            .single();

           await supabase.from("send_logs").insert({
            campaign_id: item.campaign_id,
            customer_id: item.customer_id,
            queue_id: item.id,
            channel: "whatsapp",
            phone: item.phone,
            content: item.content,
            status: "sent",
            cluster_name: (customer?.customer_clusters as any)?.name || null,
            response_data: responseData,
            user_id: ownerUserId,
          });

          // Track campaign updates
          if (!campaignUpdates[item.campaign_id]) {
            campaignUpdates[item.campaign_id] = { sent: 0, failed: 0 };
          }
          campaignUpdates[item.campaign_id].sent++;

          results.push({ id: item.id, success: true });
        } else {
          // Failed
           const errorMessage = (responseData as any)?.message || apiResult.raw || "Unknown error";
          
          await supabase
            .from("whatsapp_queue")
            .update({ 
              status: item.attempts >= 2 ? "failed" : "pending",
              error_message: errorMessage
            })
            .eq("id", item.id);

          if (item.attempts >= 2) {
            await supabase.from("send_logs").insert({
              campaign_id: item.campaign_id,
              customer_id: item.customer_id,
              queue_id: item.id,
              channel: "whatsapp",
              phone: item.phone,
              content: item.content,
              status: "failed",
              error_message: errorMessage,
              response_data: responseData,
              user_id: ownerUserId,
            });

            if (!campaignUpdates[item.campaign_id]) {
              campaignUpdates[item.campaign_id] = { sent: 0, failed: 0 };
            }
            campaignUpdates[item.campaign_id].failed++;
          }

          results.push({ id: item.id, success: false, error: errorMessage });
        }

        // Add random delay between messages (2-5 seconds)
        const delay = Math.floor(Math.random() * 3000) + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);
        
        await supabase
          .from("whatsapp_queue")
          .update({ 
            status: item.attempts >= 2 ? "failed" : "pending",
            error_message: (error as Error).message
          })
          .eq("id", item.id);

        results.push({ id: item.id, success: false, error: (error as Error).message });
      }
    }

    // Update campaign stats
    for (const [campaignId, updates] of Object.entries(campaignUpdates)) {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("sent_count, failed_count, total_recipients")
        .eq("id", campaignId)
        .single();

      if (campaign) {
        const newSentCount = (campaign.sent_count || 0) + updates.sent;
        const newFailedCount = (campaign.failed_count || 0) + updates.failed;
        
        // Check if campaign is complete
        const isComplete = newSentCount + newFailedCount >= campaign.total_recipients;

        await supabase
          .from("campaigns")
          .update({
            sent_count: newSentCount,
            failed_count: newFailedCount,
            status: isComplete ? "completed" : "running",
            completed_at: isComplete ? new Date().toISOString() : null,
          })
          .eq("id", campaignId);
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return jsonResponse({
      success: true,
      processed: results.length,
      sent: successful,
      failed,
      results,
    });
  } catch (error) {
    console.error("Error processing WhatsApp queue:", error);
    return jsonResponse({ success: false, error: (error as Error).message }, { status: 500 });
  }
});
