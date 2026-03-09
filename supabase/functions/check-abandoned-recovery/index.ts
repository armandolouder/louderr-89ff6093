import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get contacted but not-yet-recovered abandoned checkouts
    const { data: checkouts, error: checkoutErr } = await supabase
      .from("nuvemshop_abandoned_checkouts")
      .select("id, checkout_id, customer_phone, customer_email, created_at_nuvemshop, created_at, total")
      .eq("recovered", false)
      .not("contacted_at", "is", null)
      .limit(500);

    if (checkoutErr) throw checkoutErr;
    if (!checkouts || checkouts.length === 0) {
      return new Response(JSON.stringify({ recovered: 0, checked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all paid orders
    const { data: orders, error: orderErr } = await supabase
      .from("nuvemshop_orders")
      .select("customer_phone, customer_email, order_date, total, payment_status")
      .or("payment_status.eq.paid,payment_status.eq.approved,status.eq.paid,status.eq.closed")
      .limit(1000);

    if (orderErr) throw orderErr;

    // Build lookup sets from orders (normalized phones and emails)
    const ordersByPhone = new Map<string, { order_date: string; total: number }[]>();
    const ordersByEmail = new Map<string, { order_date: string; total: number }[]>();

    for (const order of orders || []) {
      const orderInfo = { order_date: order.order_date || "", total: order.total || 0 };
      if (order.customer_phone) {
        const phone = order.customer_phone.replace(/\D/g, "");
        if (!ordersByPhone.has(phone)) ordersByPhone.set(phone, []);
        ordersByPhone.get(phone)!.push(orderInfo);
      }
      if (order.customer_email) {
        const email = order.customer_email.toLowerCase().trim();
        if (!ordersByEmail.has(email)) ordersByEmail.set(email, []);
        ordersByEmail.get(email)!.push(orderInfo);
      }
    }

    let recoveredCount = 0;

    for (const checkout of checkouts) {
      const checkoutDate = new Date(checkout.created_at_nuvemshop || checkout.created_at);
      let found = false;

      // Check by phone
      if (checkout.customer_phone) {
        const phone = checkout.customer_phone.replace(/\D/g, "");
        const phoneOrders = ordersByPhone.get(phone) || [];
        found = phoneOrders.some(o => {
          if (!o.order_date) return false;
          return new Date(o.order_date) >= checkoutDate;
        });
      }

      // Check by email if not found by phone
      if (!found && checkout.customer_email) {
        const email = checkout.customer_email.toLowerCase().trim();
        const emailOrders = ordersByEmail.get(email) || [];
        found = emailOrders.some(o => {
          if (!o.order_date) return false;
          return new Date(o.order_date) >= checkoutDate;
        });
      }

      if (found) {
        await supabase
          .from("nuvemshop_abandoned_checkouts")
          .update({ recovered: true, status: "recovered" })
          .eq("id", checkout.id);
        recoveredCount++;
      }
    }

    return new Response(
      JSON.stringify({ recovered: recoveredCount, checked: checkouts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Check recovery error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
