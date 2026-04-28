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
 
    // 3. Batch check for existing executions to reduce DB roundtrips
    const checkoutIds = newCheckouts.map(c => c.id);
    const { data: existingExecs } = await supabase
      .from("recovery_executions")
      .select("checkout_id")
      .in("checkout_id", checkoutIds);
    
    const existingIds = new Set(existingExecs?.map(e => e.checkout_id) || []);
    const checkoutsToCreate = newCheckouts.filter(c => !existingIds.has(c.id) && (c.customer_phone || c.customer_email));
    
    // Get owner user_id to ensure RLS compliance and data ownership
    const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
    const ownerUserId = ownerData as string | null;
    
    if (checkoutsToCreate.length === 0) return;

    // 4. Batch insert new executions
    const executionsToInsert = checkoutsToCreate.map(checkout => ({
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
      user_id: ownerUserId,
    }));

    const { error: insertErr } = await supabase.from("recovery_executions").insert(executionsToInsert);

    if (!insertErr) {
      // 5. Batch update abandoned checkouts status
      await supabase
        .from("nuvemshop_abandoned_checkouts")
        .update({ recovery_status: "contacted", recovery_flow_id: activeFlow.id })
        .in("id", checkoutsToCreate.map(c => c.id));
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