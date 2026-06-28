import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_LIMIT = 250;
const BATCH_SIZE = 10;

// Adiciona UTM em todos os links http(s) do email para rastrear conversões na Nuvemshop
function addUtmToLinks(html: string, campaignId: string | null): string {
  if (!html) return html;
  const campaign = campaignId || "manual";
  return html.replace(/href="(https?:\/\/[^"]+)"/gi, (match, url) => {
    // Não mexe em links de descadastro nem em links que já têm UTM
    if (/utm_source=/i.test(url) || /unsubscribe|descadastr|email-unsubscribe/i.test(url)) {
      return match;
    }
    const sep = url.includes("?") ? "&" : "?";
    return `href="${url}${sep}utm_source=email&utm_medium=email&utm_campaign=${campaign}"`;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!brevoApiKey) {
      return new Response(JSON.stringify({ success: false, error: "BREVO_API_KEY not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check today's sent count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: sentToday } = await supabase
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", todayStart.toISOString());

    const remaining = DAILY_LIMIT - (sentToday || 0);
    if (remaining <= 0) {
      return new Response(JSON.stringify({ success: true, message: "Daily limit reached", sentToday }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get default sender from Brevo
    const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
      headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
    });
    let senderEmail = "";
    if (sendersRes.ok) {
      const sendersData = await sendersRes.json();
      senderEmail = sendersData.senders?.[0]?.email || "";
    }
    if (!senderEmail) {
      return new Response(JSON.stringify({ success: false, error: "No sender configured in Brevo" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch pending emails
    const batchLimit = Math.min(BATCH_SIZE, remaining);
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(batchLimit);

    if (fetchError) throw fetchError;
    if (!pendingEmails?.length) {
      return new Response(JSON.stringify({ success: true, message: "No pending emails", sentToday }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const email of pendingEmails) {
      try {
        // Check if email is unsubscribed
        const { data: unsub } = await supabase
          .from("email_unsubscribes")
          .select("id")
          .eq("email", email.email)
          .maybeSingle();

        if (unsub) {
          await supabase.from("email_queue").update({ status: "skipped", error_message: "Unsubscribed" }).eq("id", email.id);
          continue;
        }

        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: { name: "LOUDER.ink", email: senderEmail },
            to: [{ email: email.email, name: email.customer_name || undefined }],
            subject: email.subject,
            htmlContent: email.html_content,
            tags: ["email-marketing", email.campaign_id || "manual"],
          }),
        });

        if (res.ok) {
          const result = await res.json();
          await supabase.from("email_queue").update({
            status: "sent",
            sent_at: new Date().toISOString(),
            brevo_message_id: result.messageId,
            attempts: (email.attempts || 0) + 1,
          }).eq("id", email.id);
          sentCount++;

          // Update campaign sent_count
          if (email.campaign_id) {
            const { error: rpcError } = await supabase.rpc("increment_campaign_sent", { campaign_id_param: email.campaign_id });
            if (rpcError) {
              console.error("RPC increment error, using fallback:", rpcError.message);
              await supabase.from("email_campaigns")
                .update({ sent_count: sentCount })
                .eq("id", email.campaign_id);
            }
          }
        } else {
          const errText = await res.text();
          const attempts = (email.attempts || 0) + 1;
          await supabase.from("email_queue").update({
            status: attempts >= 3 ? "failed" : "pending",
            error_message: errText,
            attempts,
          }).eq("id", email.id);
          failedCount++;
        }

        // Small delay between sends (200ms)
        await new Promise((r) => setTimeout(r, 200));
      } catch (err: any) {
        await supabase.from("email_queue").update({
          status: "failed",
          error_message: err.message,
          attempts: (email.attempts || 0) + 1,
        }).eq("id", email.id);
        failedCount++;
      }
    }

    // Check if campaign is complete
    const campaignIds = [...new Set(pendingEmails.filter((e) => e.campaign_id).map((e) => e.campaign_id))];
    for (const cid of campaignIds) {
      const { count: stillPending } = await supabase
        .from("email_queue")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", cid)
        .eq("status", "pending");

      if (stillPending === 0) {
        const { data: queueStats } = await supabase
          .from("email_queue")
          .select("status")
          .eq("campaign_id", cid);

        const sent = queueStats?.filter((q) => q.status === "sent").length || 0;
        const failed = queueStats?.filter((q) => q.status === "failed").length || 0;

        await supabase.from("email_campaigns").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          sent_count: sent,
          failed_count: failed,
        }).eq("id", cid);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: pendingEmails.length,
      sent: sentCount,
      failed: failedCount,
      sentToday: (sentToday || 0) + sentCount,
      remainingToday: remaining - sentCount,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Email queue error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
