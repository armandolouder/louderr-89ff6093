import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const NUVEMSHOP_ACCESS_TOKEN = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN");
  const NUVEMSHOP_STORE_ID = Deno.env.get("NUVEMSHOP_STORE_ID");

  if (!NUVEMSHOP_ACCESS_TOKEN || !NUVEMSHOP_STORE_ID) {
    return new Response(JSON.stringify({ error: "Missing credentials" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get store info
    const storeRes = await fetch(
      `https://api.nuvemshop.com.br/v1/${NUVEMSHOP_STORE_ID}/store`,
      {
        headers: {
          "Authentication": `bearer ${NUVEMSHOP_ACCESS_TOKEN}`,
          "User-Agent": "OmniDesk (support@omnidesk.com)",
          "Content-Type": "application/json",
        },
      }
    );
    const storeData = storeRes.ok ? await storeRes.json() : { error: await storeRes.text() };
    const storeDomain = storeData.url_with_protocol || storeData.original_domain || "";

    // Get products
    const productsRes = await fetch(
      `https://api.nuvemshop.com.br/v1/${NUVEMSHOP_STORE_ID}/products?per_page=10&published=true`,
      {
        headers: {
          "Authentication": `bearer ${NUVEMSHOP_ACCESS_TOKEN}`,
          "User-Agent": "OmniDesk (support@omnidesk.com)",
          "Content-Type": "application/json",
        },
      }
    );

    let products = [];
    let rawProducts = [];
    if (productsRes.ok) {
      rawProducts = await productsRes.json();
      products = rawProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        handle: p.handle,
        price: p.variants?.[0]?.price,
        canonical_url: p.canonical_url,
        categories: p.categories?.map((c: any) => c.name),
      }));
    } else {
      const errorText = await productsRes.text();
      return new Response(JSON.stringify({ error: errorText, status: productsRes.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ storeDomain, products, rawSample: rawProducts[0] }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
