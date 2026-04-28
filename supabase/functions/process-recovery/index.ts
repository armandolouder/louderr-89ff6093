 import { createServiceClient } from "../_shared/auth.ts";
 import { corsHeaders } from "../_shared/cors.ts";
 import { syncNewAbandonedCheckouts, checkRecoveredOrders } from "./services/checkout-sync.ts";
 import { sendWhatsappRecovery, sendEmailRecovery } from "./services/message-sender.ts";
 
 Deno.serve(async (req) => {
   if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
 
   try {
     const supabase = createServiceClient();
     const now = new Date();
     let processed = 0;
     let errors = 0;
 
     // 1. Sync new checkouts into executions
     await syncNewAbandonedCheckouts(supabase);
 
     // 2. Fetch active executions to process
     const { data: activeExecs } = await supabase
       .from("recovery_executions")
       .select("*")
       .eq("status", "active")
       .order("created_at", { ascending: true })
       .limit(100);
 
     if (!activeExecs?.length) {
       return new Response(
         JSON.stringify({ success: true, processed: 0, message: "No active recoveries" }),
         { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
      // Cache flow steps to avoid redundant queries in the loop
      const flowStepsCache = new Map<string, any[]>();

      // Execute in parallel where possible, but limit concurrency to avoid overwhelming APIs/DB
      const batchSize = 10;
      for (let i = 0; i < activeExecs.length; i += batchSize) {
        const batch = activeExecs.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (exec) => {
          try {
            // Check recovery status first
            if (await checkRecoveredOrders(supabase, exec)) {
              processed++;
              return;
            }
    
            // Get steps configuration (with simple cache)
            let steps = flowStepsCache.get(exec.flow_id);
            if (!steps) {
              const { data: flowData } = await supabase.from("recovery_flows").select("steps").eq("id", exec.flow_id).single();
              steps = (flowData?.steps as any[]) || [];
              flowStepsCache.set(exec.flow_id, steps);
            }
            const stepIndex = exec.current_step;
    
            if (stepIndex >= steps.length) {
              await supabase.from("recovery_executions").update({ status: "expired", completed_at: now.toISOString() }).eq("id", exec.id);
              await supabase.from("nuvemshop_abandoned_checkouts").update({ recovery_status: "expired", expired_at: now.toISOString() }).eq("id", exec.checkout_id);
              return;
            }
    
            const step = steps[stepIndex];
    
            // Dedup & Advance: If message already exists and is sent
            const { data: existingMsg } = await supabase.from("recovery_messages")
              .select("id, status")
              .eq("execution_id", exec.id)
              .eq("step_number", stepIndex)
              .limit(1);
    
            if (existingMsg?.length) {
              if (existingMsg[0].status === "sent") {
                await supabase.from("recovery_executions").update({ current_step: stepIndex + 1 }).eq("id", exec.id);
              }
              return;
            }
    
            // Delay Check
            const { data: lastMsg } = await supabase.from("recovery_messages")
              .select("sent_at").eq("execution_id", exec.id).order("created_at", { ascending: false }).limit(1);
            const referenceTime = lastMsg?.[0]?.sent_at || exec.created_at;
            const diffMinutes = (now.getTime() - new Date(referenceTime).getTime()) / (1000 * 60);
            if (diffMinutes < (step.delay_minutes || 15)) return;
    
            // Preparation
            const variant = step.ab_enabled ? (Math.random() > 0.5 ? "B" : "A") : "A";
            const { data: msgRecord, error: msgErr } = await supabase.from("recovery_messages").insert({
              execution_id: exec.id,
              step_number: stepIndex,
              channel: step.channel || "whatsapp",
              variant,
              status: "pending",
            }).select().single();
    
            if (msgErr || !msgRecord) {
              errors++;
              return;
            }
    
            // Sending
            const channel = step.channel || "whatsapp";
            let result: { success: boolean; error?: string | null };
    
            if (channel === "whatsapp" && exec.customer_phone) {
              result = await sendWhatsappRecovery(supabase, exec, step, variant, msgRecord.id);
            } else if (channel === "email" && exec.customer_email) {
              result = await sendEmailRecovery(supabase, exec, step, variant, msgRecord.id);
            } else {
              result = { success: false, error: "Invalid channel or missing contact info" };
            }
    
            if (result.success) {
              await supabase.from("recovery_executions").update({ current_step: stepIndex + 1 }).eq("id", exec.id);
              processed++;
            } else {
              errors++;
            }
          } catch (err) {
            console.error(`Error in execution loop for ${exec.id}:`, err);
            errors++;
          }
        }));
      }
 
     return new Response(JSON.stringify({ success: true, processed, errors }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" }
     });
   } catch (error: any) {
     console.error("Main recovery error:", error);
     return new Response(JSON.stringify({ success: false, error: error.message }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" }
     });
   }
 });
