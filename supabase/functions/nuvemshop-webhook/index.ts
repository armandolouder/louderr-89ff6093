import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("Nuvemshop webhook received:", JSON.stringify(body));

    const event = body.event as string;
    const storeId = body.store_id;
    const orderData = body;

    // Extract order info
    const order = orderData;
    const orderId = order.id || order.order_id;
    const customerName =
      order.customer?.name ||
      `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() ||
      null;
    const customerEmail = order.customer?.email || null;
    const customerPhone = order.customer?.phone || null;
    const total = order.total ? parseFloat(order.total) : 0;
    const currency = order.currency || "BRL";
    const status = order.status || null;
    const paymentStatus = order.payment_status || null;
    const shippingStatus = order.shipping_status || null;

    const products = (order.products || []).map((p: any) => ({
      id: p.product_id,
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      sku: p.sku,
    }));

    const { error } = await supabase.from("nuvemshop_orders").insert({
      nuvemshop_order_id: orderId,
      store_id: storeId || parseInt(Deno.env.get("NUVEMSHOP_STORE_ID") || "0"),
      event,
      status,
      payment_status: paymentStatus,
      shipping_status: shippingStatus,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      total,
      currency,
      products,
      raw_data: body,
    });

    if (error) {
      console.error("Error inserting order:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
