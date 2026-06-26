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

function priceStr(n: number | null | undefined): string | null {
  if (n == null) return null;
  return Number(n).toFixed(2);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createServiceClient();
    const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
    const ownerUserId = ownerData as string | null;
    const creds = await getNuvemshopCredentials(supabase);
    const { storeId, accessToken } = creds;

    const body = await req.json();
    const productUuid: string | undefined = body?.product_id;
    const modelId: string | undefined = body?.model_id;
    if (!productUuid || !modelId) {
      throw new Error("product_id e model_id são obrigatórios");
    }

    // Produto local -> id da Nuvemshop
    const { data: prod, error: prodErr } = await supabase
      .from("catalog_products")
      .select("id, nuvemshop_product_id, name")
      .eq("id", productUuid)
      .single();
    if (prodErr || !prod) throw new Error("Produto não encontrado");
    const nsProductId = prod.nuvemshop_product_id;

    // Modelo de variação
    const [{ data: colorsData }, { data: matsData }, { data: sizesData }] = await Promise.all([
      supabase.from("variation_colors").select("nome_cor").eq("variation_model_id", modelId),
      supabase.from("variation_materials").select("nome_malha").eq("variation_model_id", modelId),
      supabase.from("variation_sizes").select("tamanho, preco, preco_promocional, ativo, position").eq("variation_model_id", modelId).order("position", { ascending: true }),
    ]);

    const colors: string[] = (colorsData || []).map((c: any) => c.nome_cor).filter(Boolean);
    const materials: string[] = (matsData || []).map((m: any) => m.nome_malha).filter(Boolean);
    const sizes = (sizesData || []).filter((s: any) => s.ativo && s.tamanho);

    if (sizes.length === 0) throw new Error("O modelo não possui tamanhos ativos");

    // Monta atributos dinamicamente (apenas dimensões com valores)
    const attributes: { pt: string }[] = [];
    if (colors.length) attributes.push({ pt: "Cor" });
    if (materials.length) attributes.push({ pt: "Malha" });
    attributes.push({ pt: "Tamanho" });

    // 1) Atualiza atributos do produto
    const putRes = await fetch(`${API}/${storeId}/products/${nsProductId}`, {
      method: "PUT",
      headers: nsHeaders(accessToken),
      body: JSON.stringify({ attributes }),
    });
    if (!putRes.ok) {
      throw new Error(`Erro ao atualizar atributos: ${putRes.status} - ${await putRes.text()}`);
    }

    // 2) Busca variações atuais (para apagar depois)
    const getRes = await fetch(`${API}/${storeId}/products/${nsProductId}/variants`, {
      headers: nsHeaders(accessToken),
    });
    const oldVariants: any[] = getRes.ok ? await getRes.json() : [];
    const oldIds: number[] = oldVariants.map((v) => v.id);

    // 3) Cria as novas variações (produto cartesiano)
    const colorList = colors.length ? colors : [null];
    const matList = materials.length ? materials : [null];
    let created = 0;
    const errors: string[] = [];

    for (const color of colorList) {
      for (const mat of matList) {
        for (const s of sizes) {
          const values: { pt: string }[] = [];
          if (color) values.push({ pt: color });
          if (mat) values.push({ pt: mat });
          values.push({ pt: s.tamanho });

          const payload: any = {
            values,
            price: priceStr(s.preco),
            promotional_price: priceStr(s.preco_promocional),
            stock_management: false,
          };

          const r = await fetch(`${API}/${storeId}/products/${nsProductId}/variants`, {
            method: "POST",
            headers: nsHeaders(accessToken),
            body: JSON.stringify(payload),
          });
          if (r.ok) {
            created++;
          } else {
            errors.push(`${values.map((v) => v.pt).join("/")}: ${r.status} ${await r.text()}`);
          }
          await new Promise((res) => setTimeout(res, 120));
        }
      }
    }

    if (created === 0) {
      throw new Error("Nenhuma variação criada. " + errors.slice(0, 3).join(" | "));
    }

    // 4) Apaga as variações antigas (após criar as novas)
    for (const id of oldIds) {
      await fetch(`${API}/${storeId}/products/${nsProductId}/variants/${id}`, {
        method: "DELETE",
        headers: nsHeaders(accessToken),
      });
      await new Promise((res) => setTimeout(res, 100));
    }

    // 5) Atualiza o catálogo local
    await supabase.from("catalog_variants").delete().eq("product_id", productUuid);
    await supabase
      .from("catalog_products")
      .update({ variant_count: created })
      .eq("id", productUuid);

    return new Response(
      JSON.stringify({ success: true, created, deleted: oldIds.length, errors: errors.slice(0, 5) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("apply-variations error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});