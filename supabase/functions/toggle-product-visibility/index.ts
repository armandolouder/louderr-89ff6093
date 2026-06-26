import { createServiceClient } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getNuvemshopCredentials, NUVEMSHOP_USER_AGENT } from "../_shared/nuvemshop.ts";

const API = "https://api.tiendanube.com/v1";

function nsHeaders(token: string) {
  return {
    "Authentication": `bearer ${token}`,
    "User-Agent": NUVEMSHOP_USER_AGENT,
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createServiceClient();
    const creds = await getNuvemshopCredentials(supabase);
    const { storeId, accessToken } = creds;

    const body = await req.json();
    const productUuid: string | undefined = body?.product_id;
    const published: boolean = body?.published === true;
    if (!productUuid) throw new Error("product_id é obrigatório");

    const { data: prod, error: prodErr } = await supabase
      .from("catalog_products")
      .select("id, nuvemshop_product_id, name")
      .eq("id", productUuid)
      .single();
    if (prodErr || !prod) throw new Error("Produto não encontrado");

    const res = await fetch(`${API}/${storeId}/products/${prod.nuvemshop_product_id}`, {
      method: "PUT",
      headers: nsHeaders(accessToken),
      body: JSON.stringify({ published }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Nuvemshop ${res.status}: ${txt}`);
    }

    await supabase.from("catalog_products").update({ status: published ? "active" : "draft" }).eq("id", productUuid);

    return new Response(JSON.stringify({ success: true, published }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
