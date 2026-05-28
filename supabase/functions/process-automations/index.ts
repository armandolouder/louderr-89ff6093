 import { createServiceClient } from "../_shared/auth.ts";
 import { corsHeaders } from "../_shared/cors.ts";
 import { sendUazapiMedia, sendUazapiText, hasUazapiCredentials, UazapiMediaType } from "../_shared/uazapi.ts";
 import { registerInInbox } from "../_shared/inbox-registry.ts";
 
 Deno.serve(async (req) => {
   if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
 
   try {
     if (!hasUazapiCredentials()) throw new Error("UAZAPI credentials not configured");
     const supabase = createServiceClient();
 
      const { data: executions, error } = await supabase.rpc("pick_automation_executions", { batch_size: 20 });
 
     if (error) throw error;
     if (!executions?.length) return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
 
     let processed = 0, failed = 0;
 
      // Execute automation tasks in parallel to speed up processing
      await Promise.all(executions.map(async (exec) => {
        const triggerData = exec.trigger_data as any;
        const { phone, customer_name } = exec;
        const content = triggerData.message_content || "";
        const { media_url, media_type } = triggerData;
        const customerName = customer_name || triggerData.customer_name || phone;
  
        try {
          const result = media_url && media_type 
            ? await sendUazapiMedia({ phone, mediaType: media_type as UazapiMediaType, fileUrl: media_url, caption: content })
            : await sendUazapiText(phone, content);
  
          if (result.ok) {
            await supabase.from("automation_executions").update({ status: "sent", executed_at: new Date().toISOString() }).eq("id", exec.id);
            // Keep inbox registration async but non-blocking for the main loop
            registerInInbox(supabase, {
              phone, customerName, messageContent: content, mediaUrl: media_url, mediaType: media_type,
              uazapiData: result.data, flowId: exec.flow_id, executionId: exec.id
            }).catch(err => console.error("Inbox registration error:", err));
            processed++;
          } else {
            await supabase.from("automation_executions").update({ status: "failed", error_message: result.raw.substring(0, 500), executed_at: new Date().toISOString() }).eq("id", exec.id);
            failed++;
          }
        } catch (err: any) {
          await supabase.from("automation_executions").update({ status: "failed", error_message: err.message?.substring(0, 500), executed_at: new Date().toISOString() }).eq("id", exec.id);
          failed++;
        }
      }));
 
     return new Response(JSON.stringify({ processed, failed, total: executions.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
   } catch (error: any) {
     console.error("Process automations error:", error);
     return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
   }
 });
