import { createServiceClient } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getNuvemshopCredentials, NUVEMSHOP_USER_AGENT } from "../_shared/nuvemshop.ts";

const API = "https://api.tiendanube.com/v1";

// Nomes de cores reconhecidos pela Nuvemshop (pinta a bolinha automaticamente).
const NUVEM_COLOR_NAMES = [
  "Preto","Preto fosco","Chumbo","Grafite","Cinza escuro","Cinza","Cinza claro","Prata","Platina","Cimento","Taupe","Fumê","Gelo","Off white","Branco",
  "Azul escuro","Azul marinho","Azul royal","Azul bic","Azul","Azul céu","Azul claro","Azul bebê","Azul petróleo","Azul piscina","Azul Tiffany","Azul turquesa","Ciano","Azul jeans","Jeans escuro","Jeans claro",
  "Verde escuro","Verde bandeira","Verde","Verde claro","Verde militar","Verde musgo","Verde oliva","Verde bebê","Verde água","Verde neon","Verde limão","Pêra",
  "Marrom escuro","Chocolate","Marrom","Marrom claro","Castanho","Café","Madeira","Caramelo","Cobre","Siena","Tabaco","Avelã","Champagne","Nude","Natural","Bege","Areia","Pérola","Creme","Marfim","Dourado ou Ouro","Âmbar","Mostarda","Mel","Milho","Palha","Cáqui","Amarelo","Amarelo limão","Amarelo neon",
  "Indigo","Uva ou Violeta","Roxo","Lilás","Lavanda","Framboesa","Rose gold","Rosa escuro","Rosa antigo","Rosa","Rose","Rosa bebê","Rosa chiclete","Rosa neon","Pink","Melancia","Fúcsia ou Magenta",
  "Vinho","Bordô","Vermelho escuro","Vermelho","Tomate","Cereja","Morango","Grená","Marsala","Mogno","Terra","Goiaba","Salmão","Coral","Ferrugem ou Telha","Bronze","Tangerina","Laranja","Laranja neon","Pêssego",
];
const ALIASES: Record<string, string> = {
  "preta": "Preto", "branca": "Branco", "vermelha": "Vermelho", "amarela": "Amarelo",
  "cinza chumbo": "Chumbo", "marinho": "Azul marinho", "rosa pink": "Pink",
};
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const COLOR_BY_NORM = new Map(NUVEM_COLOR_NAMES.map((n) => [norm(n), n]));
function normalizeColorName(name: string): string {
  const n = norm(name);
  if (COLOR_BY_NORM.has(n)) return COLOR_BY_NORM.get(n)!;
  if (ALIASES[n]) return ALIASES[n];
  return name;
}

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
    // Aceita um único model_id (legado) ou vários model_ids
    const modelIds: string[] = Array.isArray(body?.model_ids)
      ? body.model_ids.filter(Boolean)
      : body?.model_id
        ? [body.model_id]
        : [];
    if (!productUuid || modelIds.length === 0) {
      throw new Error("product_id e model_ids são obrigatórios");
    }

    // Produto local -> id da Nuvemshop
    const { data: prod, error: prodErr } = await supabase
      .from("catalog_products")
      .select("id, nuvemshop_product_id, name, raw")
      .eq("id", productUuid)
      .single();
    if (prodErr || !prod) throw new Error("Produto não encontrado");
    const nsProductId = prod.nuvemshop_product_id;

    // Busca cores/malhas/tamanhos de TODOS os modelos selecionados de uma vez
    const [{ data: colorsData }, { data: matsData }, { data: sizesData }] = await Promise.all([
      supabase.from("variation_colors").select("variation_model_id, nome_cor").in("variation_model_id", modelIds),
      supabase.from("variation_materials").select("variation_model_id, nome_malha").in("variation_model_id", modelIds),
      supabase.from("variation_sizes").select("variation_model_id, tamanho, preco, preco_promocional, ativo, position").in("variation_model_id", modelIds).order("position", { ascending: true }),
    ]);

    // Agrupa por modelo
    const byModel = (rows: any[], key: string) => {
      const map = new Map<string, any[]>();
      for (const r of rows || []) {
        const arr = map.get(r.variation_model_id) || [];
        arr.push(r);
        map.set(r.variation_model_id, arr);
      }
      return map;
    };
    const colorsByModel = byModel(colorsData || [], "nome_cor");
    const matsByModel = byModel(matsData || [], "nome_malha");
    const sizesByModel = byModel(sizesData || [], "tamanho");

    // Gera as variações de cada modelo independentemente e une por assinatura
    let anyColor = false;
    let anyMaterial = false;
    type V = { color: string | null; mat: string | null; size: any };
    const variantMap = new Map<string, V>();
    for (const mId of modelIds) {
      const mColors: string[] = (colorsByModel.get(mId) || [])
        .map((c: any) => c.nome_cor).filter(Boolean).map((c: string) => normalizeColorName(c));
      const mMats: string[] = (matsByModel.get(mId) || []).map((m: any) => m.nome_malha).filter(Boolean);
      const mSizes = (sizesByModel.get(mId) || []).filter((s: any) => s.ativo && s.tamanho);
      if (mColors.length) anyColor = true;
      if (mMats.length) anyMaterial = true;
      const cList = mColors.length ? mColors : [null];
      const matL = mMats.length ? mMats : [null];
      for (const color of cList) {
        for (const mat of matL) {
          for (const s of mSizes) {
            const sig = `${color ?? ""}|${mat ?? ""}|${s.tamanho}`;
            if (!variantMap.has(sig)) variantMap.set(sig, { color, mat, size: s });
          }
        }
      }
    }

    const allVariants = Array.from(variantMap.values());
    if (allVariants.length === 0) throw new Error("Os modelos não possuem tamanhos ativos");

    // Atributos = união das dimensões usadas por qualquer modelo
    const attributes: { pt: string }[] = [];
    if (anyColor) attributes.push({ pt: "Cor" });
    if (anyMaterial) attributes.push({ pt: "Malha" });
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

    // 3) Cria as novas variações (união de todos os modelos selecionados)
    let created = 0;
    const errors: string[] = [];
    for (const v of allVariants) {
      const values: { pt: string }[] = [];
      // Mantém a ordem dos atributos (Cor, Malha, Tamanho)
      if (anyColor) values.push({ pt: v.color ?? "—" });
      if (anyMaterial) values.push({ pt: v.mat ?? "—" });
      values.push({ pt: v.size.tamanho });

      const payload: any = {
        values,
        price: priceStr(v.size.preco),
        promotional_price: priceStr(v.size.preco_promocional),
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
        errors.push(`${values.map((x) => x.pt).join("/")}: ${r.status} ${await r.text()}`);
      }
      await new Promise((res) => setTimeout(res, 120));
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

    const productUrl: string | null = (prod as any)?.raw?.canonical_url || null;

    return new Response(
      JSON.stringify({ success: true, created, deleted: oldIds.length, product_url: productUrl, errors: errors.slice(0, 5) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("apply-variations error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});