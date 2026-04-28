 import { createServiceClient } from "../_shared/auth.ts";
 import { corsHeaders } from "../_shared/cors.ts";
 import { getSyncParams } from "./utils/params.ts";
 import { fetchOrdersFromNuvemshop } from "./services/nuvemshop-api.ts";

 Deno.serve(async (req) => {
   if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
 
   try {
     const supabase = createServiceClient();
     const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
     const ownerUserId = ownerData as string | null;
 
     const params = await getSyncParams(req);
     const orders = await fetchOrdersFromNuvemshop(params);
     
     let synced = 0;
     let errors = 0;
 
     for (const order of orders) {
       const customerName = order.customer?.name || order.contact_name || 
         `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() || 
         order.billing_name || null;
 
       const { error } = await supabase.from("nuvemshop_orders").upsert({
         nuvemshop_order_id: (order.id || order.number)?.toString(),
         status: order.status || null,
         payment_status: order.payment_status || null,
         shipping_status: order.shipping_status || null,
         customer_name: customerName,
         customer_email: order.customer?.email || order.contact_email || null,
         customer_phone: order.customer?.phone || order.contact_phone || order.billing_phone || null,
         total: order.total ? parseFloat(order.total) : 0,
         currency: order.currency || "BRL",
         products: (order.products || []).map((p: any) => ({
           id: p.product_id, name: p.name, quantity: p.quantity, price: p.price, sku: p.sku,
         })),
         order_date: order.created_at || null,
         order_number: order.number?.toString() || null,
         user_id: ownerUserId,
       }, { onConflict: "nuvemshop_order_id" });
 
       if (error) {
         console.error(`Error upserting order ${order.id}:`, error.message);
         errors++;
       } else {
         synced++;
       }
     }
 
     return new Response(JSON.stringify({
       success: true, total_fetched: orders.length, synced, errors, 
       page: params.page, has_more: orders.length === params.perPage,
     }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
   } catch (error: any) {
     console.error("Sync error:", error);
     return new Response(JSON.stringify({ error: error.message }), {
       status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
     });
   }
 });
