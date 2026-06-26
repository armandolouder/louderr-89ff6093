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

function variantValuesSignature(values: any[] | null | undefined): string {
  return (values || [])
    .map((value) => {
      if (typeof value === "string") return value;
      return value?.pt || value?.name?.pt || value?.name || "";
    })
    .join("|");
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

    // Ordem padrão fixa das malhas (sempre nesta sequência ao atualizar)
    const MATERIAL_ORDER = ["UNISSEX", "BABYLOOK", "EGIPCIA", "OVERSIZED", "MANGA LONGA", "MOLETOM"];
    const matRank = (m: string | null): number => {
      if (!m) return MATERIAL_ORDER.length + 1;
      const norm = m.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
      const idx = MATERIAL_ORDER.indexOf(norm);
      return idx === -1 ? MATERIAL_ORDER.length : idx;
    };
    // Ordem padrão fixa dos tamanhos
    const SIZE_ORDER = ["P", "M", "G", "GG", "XG", "G1", "G2", "G3"];
    const sizeRank = (s: string | null): number => {
      if (!s) return SIZE_ORDER.length + 1;
      const norm = String(s).toUpperCase().trim();
      const idx = SIZE_ORDER.indexOf(norm);
      return idx === -1 ? SIZE_ORDER.length : idx;
    };
    // Ordena por: malha -> tamanho -> cor (a ordem em que enviamos define a
    // ordem exibida na Nuvemshop)
    allVariants.sort((a, b) =>
      matRank(a.mat) - matRank(b.mat) ||
      sizeRank(a.size?.tamanho) - sizeRank(b.size?.tamanho) ||
      String(a.color ?? "").localeCompare(String(b.color ?? ""))
    );

    console.log("apply-variations: modelos=", modelIds.length, "variantes geradas=", allVariants.length);
    console.log("apply-variations: assinaturas=", Array.from(variantMap.keys()).join(" ; "));
    console.log("apply-variations: anyColor=", anyColor, "anyMaterial=", anyMaterial);

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

    // 2) Busca e APAGA as variações atuais ANTES de criar as novas.
    //    A Nuvemshop rejeita criar uma variante cuja combinação de valores já
    //    exista em outra variante, então precisamos limpar primeiro — senão os
    //    modelos que repetem combinações são descartados silenciosamente.
    const getRes = await fetch(`${API}/${storeId}/products/${nsProductId}/variants`, {
      headers: nsHeaders(accessToken),
    });
    const oldVariants: any[] = getRes.ok ? await getRes.json() : [];
    const oldIds: number[] = oldVariants.map((v) => v.id);

    // A Nuvemshop não permite um produto sem nenhuma variante. Mantemos a 1ª
    // antiga e a apagamos por último, depois de criar as novas.
    const keepLastId = oldIds.length > 0 ? oldIds[0] : null;
    const deleteFirstIds = oldIds.slice(1);
    for (const id of deleteFirstIds) {
      await fetch(`${API}/${storeId}/products/${nsProductId}/variants/${id}`, {
        method: "DELETE",
        headers: nsHeaders(accessToken),
      });
      await new Promise((res) => setTimeout(res, 100));
    }

    // 3) Cria as novas variações (união de todos os modelos selecionados).
    //    Para evitar "Variants cannot be repeated", reaproveitamos a última
    //    variação antiga mantida como placeholder: atualizamos ela para a 1ª
    //    combinação desejada e criamos apenas as demais.
    let created = 0;
    let reusedPlaceholder = 0;
    const errors: string[] = [];
    const variantsToCreate = [...allVariants];

    if (keepLastId != null && variantsToCreate.length > 0) {
      // Reaproveita a variação antiga mantida, mas SEMPRE como a 1ª combinação
      // da ordem desejada (para a sequência exibida na loja ficar correta).
      const [variantForPlaceholder] = variantsToCreate.splice(0, 1);
      const values: { pt: string }[] = [];
      if (anyColor) values.push({ pt: variantForPlaceholder.color ?? "—" });
      if (anyMaterial) values.push({ pt: variantForPlaceholder.mat ?? "—" });
      values.push({ pt: variantForPlaceholder.size.tamanho });

      const payload: any = {
        values,
        price: priceStr(variantForPlaceholder.size.preco),
        promotional_price: priceStr(variantForPlaceholder.size.preco_promocional),
        stock_management: false,
      };

      const updateRes = await fetch(`${API}/${storeId}/products/${nsProductId}/variants/${keepLastId}`, {
        method: "PUT",
        headers: nsHeaders(accessToken),
        body: JSON.stringify(payload),
      });
      if (updateRes.ok) {
        reusedPlaceholder = 1;
      } else {
        const errText = await updateRes.text();
        console.error("apply-variations: falha ao atualizar placeholder", values.map((x) => x.pt).join("/"), updateRes.status, errText);
        errors.push(`${values.map((x) => x.pt).join("/")}: ${updateRes.status} ${errText}`);
      }
      await new Promise((res) => setTimeout(res, 120));
    }

    for (const v of variantsToCreate) {
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
        const errText = await r.text();
        console.error("apply-variations: falha ao criar variante", values.map((x) => x.pt).join("/"), r.status, errText);
        errors.push(`${values.map((x) => x.pt).join("/")}: ${r.status} ${errText}`);
      }
      await new Promise((res) => setTimeout(res, 120));
    }

    const applied = created + reusedPlaceholder;
    console.log("apply-variations: aplicadas=", applied, "criadas=", created, "reaproveitadas=", reusedPlaceholder, "de", allVariants.length, "erros=", errors.length);

    if (applied === 0) {
      throw new Error("Nenhuma variação criada. " + errors.slice(0, 3).join(" | "));
    }

    // 5) Atualiza o catálogo local
    await supabase.from("catalog_variants").delete().eq("product_id", productUuid);
    await supabase
      .from("catalog_products")
      .update({ variant_count: applied })
      .eq("id", productUuid);

    const productUrl: string | null = (prod as any)?.raw?.canonical_url || null;

    return new Response(
      JSON.stringify({ success: true, created: applied, deleted: oldIds.length - reusedPlaceholder, product_url: productUrl, errors: errors.slice(0, 5) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("apply-variations error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});