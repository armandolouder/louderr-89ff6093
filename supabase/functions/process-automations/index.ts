import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This function processes pending automation executions
// It should be called periodically (e.g., via pg_cron every minute)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const UAZAPI_SERVER_URL = Deno.env.get("UAZAPI_SERVER_URL");
    const UAZAPI_INSTANCE_TOKEN = Deno.env.get("UAZAPI_INSTANCE_TOKEN");

    if (!UAZAPI_SERVER_URL || !UAZAPI_INSTANCE_TOKEN) {
      throw new Error("UAZAPI credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get pending executions that are due
    const { data: executions, error } = await supabase
      .from("automation_executions")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(20);

    if (error) throw error;
    if (!executions || executions.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let failed = 0;

    for (const exec of executions) {
      const triggerData = exec.trigger_data as any;
      const phone = exec.phone;
      const messageContent = triggerData.message_content || "";
      const mediaUrl = triggerData.media_url;
      const mediaType = triggerData.media_type;

      try {
        let uazapiResponse;

        if (mediaUrl && mediaType) {
          // Send media message
          uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/send/media`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              token: UAZAPI_INSTANCE_TOKEN,
            },
            body: JSON.stringify({
              number: phone,
              type: mediaType,
              file: mediaUrl,
              text: messageContent,
            }),
          });
        } else {
          // Send text message
          uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/send/text`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              token: UAZAPI_INSTANCE_TOKEN,
            },
            body: JSON.stringify({
              number: phone,
              text: messageContent,
            }),
          });
        }

        const responseText = await uazapiResponse.text();
        console.log(`Automation sent to ${phone}: ${uazapiResponse.status}`);

        if (uazapiResponse.ok) {
          await supabase
            .from("automation_executions")
            .update({
              status: "sent",
              executed_at: new Date().toISOString(),
            })
            .eq("id", exec.id);
          processed++;
        } else {
          await supabase
            .from("automation_executions")
            .update({
              status: "failed",
              error_message: responseText.substring(0, 500),
              executed_at: new Date().toISOString(),
            })
            .eq("id", exec.id);
          failed++;
        }
      } catch (sendError: any) {
        await supabase
          .from("automation_executions")
          .update({
            status: "failed",
            error_message: sendError.message?.substring(0, 500),
            executed_at: new Date().toISOString(),
          })
          .eq("id", exec.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed, failed, total: executions.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Process automations error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
