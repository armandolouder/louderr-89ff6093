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
    const accessToken = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN");
    const storeId = Deno.env.get("NUVEMSHOP_STORE_ID");
    const appId = Deno.env.get("NUVEMSHOP_APP_ID") || "0";

    if (!accessToken || !storeId) {
      return new Response(
        JSON.stringify({ error: "NUVEMSHOP_ACCESS_TOKEN ou NUVEMSHOP_STORE_ID não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional query params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("per_page") || "50");
    const sinceId = url.searchParams.get("since_id");

    const apiBaseUrl = "https://api.tiendanube.com/v1";
    let apiUrl = `${apiBaseUrl}/${storeId}/orders?page=${page}&per_page=${perPage}`;
    if (sinceId) {
      apiUrl += `&since_id=${sinceId}`;
    }

    const trimmedToken = accessToken.trim();
    console.log(`Token first 8: ${trimmedToken.substring(0, 8)}, length: ${trimmedToken.length}, URL: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        "Authentication": `bearer ${trimmedToken}`,
        "User-Agent": "LOUDER.ink (allvisualweb@gmail.com)",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Nuvemshop API error [${response.status}]:`, errorText);
      return new Response(
        JSON.stringify({ error: `Nuvemshop API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orders = await response.json();
    console.log(`Received ${orders.length} orders from Nuvemshop`);

    let synced = 0;
    let errors = 0;

    for (const order of orders) {
      const customerName =
        order.customer?.name ||
        `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() ||
        null;

      const products = (order.products || []).map((p: any) => ({
        id: p.product_id,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        sku: p.sku,
      }));

      const total = order.total ? parseFloat(order.total) : 0;

      const orderDate = order.created_at || null;

      const { error } = await supabase.from("nuvemshop_orders").upsert(
        {
          nuvemshop_order_id: order.id || order.number,
          store_id: parseInt(storeId),
          event: "order/synced",
          status: order.status || null,
          payment_status: order.payment_status || null,
          shipping_status: order.shipping_status || null,
          customer_name: customerName,
          customer_email: order.customer?.email || null,
          customer_phone: order.customer?.phone || null,
          total,
          currency: order.currency || "BRL",
          products,
          raw_data: order,
          order_date: orderDate,
        },
        { onConflict: "nuvemshop_order_id" }
      );

      if (error) {
        console.error(`Error upserting order ${order.id}:`, error.message);
        errors++;
      } else {
        synced++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_fetched: orders.length,
        synced,
        errors,
        page,
        has_more: orders.length === perPage,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
