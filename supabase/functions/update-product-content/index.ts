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

// Salva o conteúdo/SEO editado na Nuvemshop após revisão do usuário.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createServiceClient();
    const creds = await getNuvemshopCredentials(supabase);
    const { storeId, accessToken } = creds;

    const body = await req.json();
    const productUuid: string | undefined = body?.product_id;
    if (!productUuid) throw new Error("product_id é obrigatório");
    const content = body?.content || {};
    const images: { id: string; alt?: string; position?: number }[] = Array.isArray(body?.images) ? body.images : [];

    const { data: prod, error: prodErr } = await supabase
      .from("catalog_products")
      .select("id, nuvemshop_product_id, handle, raw, catalog_images(id, nuvemshop_image_id)")
      .eq("id", productUuid)
      .single();
    if (prodErr || !prod) throw new Error("Produto não encontrado");
    const pid = (prod as any).nuvemshop_product_id;

    // Monta payload do produto (apenas campos enviados)
    const productPayload: any = {};
    if (content.name != null) productPayload.name = { pt: content.name };
    if (content.description != null) productPayload.description = { pt: content.description };
    // URL SEO (handle) nunca é alterada. A Nuvemshop pode recalcular o slug
    // quando o nome muda; por isso reenviamos explicitamente o handle atual salvo.
    const rawHandle = ((prod as any).raw || {})?.handle;
    const currentHandle = (prod as any).handle || (typeof rawHandle === "string" ? rawHandle : rawHandle?.pt);
    if (currentHandle) productPayload.handle = { pt: currentHandle };
    if (content.seo_title != null) productPayload.seo_title = { pt: content.seo_title };
    if (content.seo_description != null) productPayload.seo_description = { pt: content.seo_description };
    if (content.tags != null) productPayload.tags = content.tags;

    const errors: string[] = [];

    if (Object.keys(productPayload).length > 0) {
      const res = await fetch(`${API}/${storeId}/products/${pid}`, {
        method: "PUT",
        headers: nsHeaders(accessToken),
        body: JSON.stringify(productPayload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Nuvemshop ${res.status}: ${txt}`);
      }
      // Atualiza espelho local
      await supabase.from("catalog_products").update({
        name: content.name ?? (prod as any).name,
        description: content.description,
        raw: { ...((prod as any).raw || {}), tags: content.tags },
      }).eq("id", productUuid);
    }

    // Imagens: alt + reordenação
    const idMap = new Map<string, string>();
    for (const ci of ((prod as any).catalog_images || [])) {
      if (ci.nuvemshop_image_id) idMap.set(ci.id, ci.nuvemshop_image_id);
    }
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const nsImgId = idMap.get(img.id);
      if (!nsImgId) continue;
      const imgPayload: any = { position: i + 1 };
      if (img.alt != null && img.alt !== "") imgPayload.alt = img.alt;
      const res = await fetch(`${API}/${storeId}/products/${pid}/images/${nsImgId}`, {
        method: "PUT",
        headers: nsHeaders(accessToken),
        body: JSON.stringify(imgPayload),
      });
      if (!res.ok) {
        const txt = await res.text();
        errors.push(`Imagem ${i + 1}: ${res.status} ${txt.slice(0, 120)}`);
      } else {
        await supabase.from("catalog_images").update({ position: i + 1 }).eq("id", img.id);
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    return new Response(JSON.stringify({ success: true, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});