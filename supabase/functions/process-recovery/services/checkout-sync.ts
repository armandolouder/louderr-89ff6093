 import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 export async function syncNewAbandonedCheckouts(supabase: SupabaseClient) {
   // 1. Find new abandoned checkouts without active recovery
   const { data: newCheckouts } = await supabase
     .from("nuvemshop_abandoned_checkouts")
     .select("*")
     .eq("recovery_status", "pending")
     .is("recovered", false)
     .order("created_at", { ascending: true })
     .limit(50);
 
   if (!newCheckouts?.length) return;
 
   // 2. Get active recovery flow
   const { data: flows } = await supabase
     .from("recovery_flows")
     .select("*")
     .eq("is_active", true)
     .limit(1);
 
   const activeFlow = flows?.[0];
   if (!activeFlow) return;
 
   // Create recovery executions for new checkouts
   for (const checkout of newCheckouts) {
     if (!checkout.customer_phone && !checkout.customer_email) continue;
 
     // DEDUP: Check if execution already exists for this checkout
     const { data: existingExec } = await supabase
       .from("recovery_executions")
       .select("id")
       .eq("checkout_id", checkout.id)
       .limit(1);
 
     if (existingExec?.length) continue; 
 
     const { error: insertErr } = await supabase.from("recovery_executions").insert({
       checkout_id: checkout.id,
       flow_id: activeFlow.id,
       current_step: 0,
       status: "active",
       customer_phone: checkout.customer_phone,
       customer_email: checkout.customer_email,
       customer_name: checkout.customer_name,
       cart_value: checkout.total || 0,
       cart_items: checkout.products || [],
       recovery_url: checkout.recovery_url,
     });
 
     if (!insertErr) {
       await supabase
         .from("nuvemshop_abandoned_checkouts")
         .update({ recovery_status: "contacted", recovery_flow_id: activeFlow.id })
         .eq("id", checkout.id);
     }
   }
 }
 
 export async function checkRecoveredOrders(supabase: SupabaseClient, exec: any) {
   if (!exec.customer_phone && !exec.customer_email) return false;
   
   const query = supabase.from("nuvemshop_orders").select("id").limit(1);
   if (exec.customer_phone) {
     query.eq("customer_phone", exec.customer_phone);
   } else {
     query.eq("customer_email", exec.customer_email);
   }
   
   const { data: orders } = await query;
   if (orders?.length) {
     const now = new Date().toISOString();
     await supabase.from("recovery_executions")
       .update({ status: "recovered", completed_at: now })
       .eq("id", exec.id);
     await supabase.from("nuvemshop_abandoned_checkouts")
       .update({ recovered: true, recovery_status: "recovered" })
       .eq("id", exec.checkout_id);
     return true;
   }
   return false;
 }