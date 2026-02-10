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

    if (!accessToken || !storeId) {
      return new Response(
        JSON.stringify({ error: "NUVEMSHOP_ACCESS_TOKEN ou NUVEMSHOP_STORE_ID não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("per_page") || "50");
    const createdAtMin = url.searchParams.get("created_at_min");
    const createdAtMax = url.searchParams.get("created_at_max");

    const apiBaseUrl = "https://api.tiendanube.com/v1";
    let apiUrl = `${apiBaseUrl}/${storeId}/checkouts?page=${page}&per_page=${perPage}`;
    if (createdAtMin) apiUrl += `&created_at_min=${encodeURIComponent(createdAtMin)}`;
    if (createdAtMax) apiUrl += `&created_at_max=${encodeURIComponent(createdAtMax)}`;

    const trimmedToken = accessToken.trim();
    console.log(`Fetching abandoned checkouts: ${apiUrl}`);

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

    const checkouts = await response.json();
    console.log(`Received ${checkouts.length} abandoned checkouts`);

    let synced = 0;
    let errors = 0;

    for (const checkout of checkouts) {
      const customerName =
        checkout.customer?.name ||
        `${checkout.customer?.first_name || ""} ${checkout.customer?.last_name || ""}`.trim() ||
        null;

      const products = (checkout.products || []).map((p: any) => ({
        id: p.product_id,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        image: p.image?.src || null,
      }));

      const total = checkout.total ? parseFloat(checkout.total) : 0;

      const { error } = await supabase.from("nuvemshop_abandoned_checkouts").upsert(
        {
          checkout_id: checkout.id,
          store_id: parseInt(storeId),
          customer_name: customerName,
          customer_email: checkout.customer?.email || null,
          customer_phone: checkout.customer?.phone || null,
          recovery_url: checkout.checkout_url || checkout.recovery_url || null,
          total,
          currency: checkout.currency || "BRL",
          products,
          status: "abandoned",
          created_at_nuvemshop: checkout.created_at || null,
          updated_at_nuvemshop: checkout.updated_at || null,
          raw_data: checkout,
        },
        { onConflict: "checkout_id" }
      );

      if (error) {
        console.error(`Error upserting checkout ${checkout.id}:`, error.message);
        errors++;
      } else {
        synced++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_fetched: checkouts.length,
        synced,
        errors,
        page,
        has_more: checkouts.length === perPage,
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
