import { createServiceClient } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getNuvemshopCredentials, NUVEMSHOP_USER_AGENT } from "../_shared/nuvemshop.ts";

// Extrai o texto localizado de campos da Nuvemshop (que podem ser { pt: "..." } ou string)
function loc(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, string>;
    return obj.pt || obj.es || obj.en || Object.values(obj)[0] || null;
  }
  return null;
}

function isColorAttr(name: string): boolean {
  return /cor|color/i.test(name);
}
function isSizeAttr(name: string): boolean {
  return /tamanho|size|talle/i.test(name);
}

async function fetchProductsPage(storeId: string, accessToken: string, page: number, perPage: number) {
  const url = `https://api.tiendanube.com/v1/${storeId}/products?page=${page}&per_page=${perPage}`;
  const response = await fetch(url, {
    headers: {
      "Authentication": `bearer ${accessToken}`,
      "User-Agent": NUVEMSHOP_USER_AGENT,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nuvemshop API error: ${response.status} - ${errorText}`);
  }
  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createServiceClient();
    const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
    const ownerUserId = ownerData as string | null;
    const creds = await getNuvemshopCredentials(supabase);

    const urlObj = new URL(req.url);
    let page = parseInt(urlObj.searchParams.get("page") || "1", 10);
    let perPage = parseInt(urlObj.searchParams.get("per_page") || "50", 10);

    // Permite parâmetros também via corpo (POST)
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.page) page = Number(body.page);
        if (body?.per_page) perPage = Number(body.per_page);
      } catch (_) { /* sem corpo */ }
    }

    const products = await fetchProductsPage(creds.storeId, creds.accessToken, page, perPage);
    let synced = 0;

    for (const product of products) {
      const productName = loc(product.name);
      const category = Array.isArray(product.categories) && product.categories.length > 0
        ? loc(product.categories[0].name)
        : null;
      const images = Array.isArray(product.images) ? product.images : [];
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const attributeNames: string[] = Array.isArray(product.attributes)
        ? product.attributes.map((a: unknown) => loc(a) || "")
        : [];

      const { data: upserted, error: prodErr } = await supabase
        .from("catalog_products")
        .upsert({
          nuvemshop_product_id: String(product.id),
          name: productName,
          description: loc(product.description),
          category,
          brand: product.brand ? loc(product.brand) : null,
          status: product.published === false ? "draft" : "published",
          handle: loc(product.handle),
          image_count: images.length,
          variant_count: variants.length,
          raw: product,
          user_id: ownerUserId,
        }, { onConflict: "nuvemshop_product_id" })
        .select("id")
        .single();

      if (prodErr || !upserted) {
        console.error("Erro ao salvar produto", product.id, prodErr?.message);
        continue;
      }

      const productId = upserted.id;

      // Substitui variações e imagens deste produto
      await supabase.from("catalog_variants").delete().eq("product_id", productId);
      await supabase.from("catalog_images").delete().eq("product_id", productId);

      if (variants.length > 0) {
        const variantRows = variants.map((v: any) => {
          const values: string[] = Array.isArray(v.values)
            ? v.values.map((val: unknown) => loc(val) || "")
            : [];
          let color: string | null = null;
          let size: string | null = null;
          attributeNames.forEach((attrName, idx) => {
            const val = values[idx] || null;
            if (!val) return;
            if (isColorAttr(attrName)) color = val;
            else if (isSizeAttr(attrName)) size = val;
          });
          return {
            product_id: productId,
            nuvemshop_variant_id: String(v.id),
            name: values.join(" / ") || null,
            size,
            color,
            price: v.price ? parseFloat(v.price) : null,
            stock: typeof v.stock === "number" ? v.stock : (v.stock ? parseInt(v.stock, 10) : null),
            sku: v.sku || null,
            user_id: ownerUserId,
          };
        });
        await supabase.from("catalog_variants").upsert(variantRows, { onConflict: "nuvemshop_variant_id" });
      }

      if (images.length > 0) {
        const imageRows = images.map((img: any) => ({
          product_id: productId,
          nuvemshop_image_id: img.id ? String(img.id) : null,
          image_url: img.src,
          position: typeof img.position === "number" ? img.position : null,
          user_id: ownerUserId,
        }));
        await supabase.from("catalog_images").insert(imageRows);
      }

      synced++;
    }

    return new Response(JSON.stringify({
      success: true,
      synced,
      total_fetched: products.length,
      page,
      has_more: products.length === perPage,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("sync-catalog error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});