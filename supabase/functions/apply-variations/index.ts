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

function canonicalVariantSignature(values: any[] | null | undefined): string {
  return (values || [])
    .map((value) => {
      const raw = typeof value === "string" ? value : value?.pt || value?.name?.pt || value?.name || "";
      return String(raw).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    })
    .join("|");
}

function makeVariantValues(v: { color: string | null; mat: string | null; size: any }, anyColor: boolean, anyMaterial: boolean): { pt: string }[] {
  const values: { pt: string }[] = [];
  if (anyColor) values.push({ pt: v.color ?? "—" });
  if (anyMaterial) values.push({ pt: v.mat ?? "—" });
  values.push({ pt: v.size.tamanho });
  return values;
}

function makeVariantPayload(v: { color: string | null; mat: string | null; size: any }, anyColor: boolean, anyMaterial: boolean) {
  return {
    values: makeVariantValues(v, anyColor, anyMaterial),
    price: priceStr(v.size.preco),
    promotional_price: priceStr(v.size.preco_promocional),
    stock_management: false,
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    //    exista em outra variante. Por isso fazemos "clean slate": mantém só
    //    uma variante obrigatória como placeholder e remove todas as demais.
    const fetchCurrentVariants = async (): Promise<any[]> => {
      const perPage = 200;
      const all: any[] = [];
      for (let page = 1; page <= 50; page++) {
        const res = await fetch(`${API}/${storeId}/products/${nsProductId}/variants?page=${page}&per_page=${perPage}`, {
          headers: nsHeaders(accessToken),
        });
        if (!res.ok) {
          console.warn("apply-variations: falha ao buscar variantes", res.status, await res.text());
          break;
        }
        const batch = await res.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < perPage) break;
      }
      return all;
    };

    const oldVariants: any[] = await fetchCurrentVariants();
    const oldIds: number[] = oldVariants.map((v) => v.id);

    const deleteVariant = async (id: number) => {
      const deleteRes = await fetch(`${API}/${storeId}/products/${nsProductId}/variants/${id}`, {
        method: "DELETE",
        headers: nsHeaders(accessToken),
      });
      if (!deleteRes.ok) {
        console.warn("apply-variations: falha ao apagar variante antiga", id, deleteRes.status, await deleteRes.text());
        return false;
      }
      return true;
    };

    const placeholderId: number | null = oldVariants[0]?.id ?? null;
    const deleteFirstIds = oldVariants.map((v) => v.id).filter((id) => id && id !== placeholderId);
    console.log("apply-variations: variantes antigas encontradas=", oldVariants.length, "placeholder=", placeholderId, "apagando=", deleteFirstIds.length);

    for (const id of deleteFirstIds) {
      await deleteVariant(id);
      await delay(120);
    }

    // Confirma que todas as variantes antigas saíram. Em alguns casos a API da
    // Nuvemshop demora alguns ms para refletir o DELETE; se criarmos antes, ela
    // responde 422 "Variants cannot be repeated".
    for (let attempt = 1; attempt <= 12; attempt++) {
      const current = await fetchCurrentVariants();
      const leftovers = current.filter((v) => v?.id && v.id !== placeholderId);
      if (leftovers.length === 0) break;

      console.warn("apply-variations: aguardando limpeza de variantes antigas", leftovers.length, "tentativa", attempt);
      for (const leftover of leftovers) {
        await deleteVariant(leftover.id);
        await delay(80);
      }
      await delay(250 + attempt * 100);
    }

    // 3) Cria as novas variações (união de todos os modelos selecionados).
    //    A ordem final é garantida porque só fica o placeholder e o restante é
    //    recriado na sequência ordenada acima.
    let created = 0;
    let reusedPlaceholder = 0;
    let reusedExisting = 0;
    const errors: string[] = [];
    const variantsToCreate = [...allVariants];

    if (placeholderId != null && variantsToCreate.length > 0) {
      // Reaproveita a variação antiga mantida, mas SEMPRE como a 1ª combinação
      // da ordem desejada (para a sequência exibida na loja ficar correta).
      const [variantForPlaceholder] = variantsToCreate.splice(0, 1);
      const payload: any = makeVariantPayload(variantForPlaceholder, anyColor, anyMaterial);
      const values = payload.values;

      let updateRes = await fetch(`${API}/${storeId}/products/${nsProductId}/variants/${placeholderId}`, {
        method: "PUT",
        headers: nsHeaders(accessToken),
        body: JSON.stringify(payload),
      });

      if (!updateRes.ok && updateRes.status === 422) {
        const errText = await updateRes.clone().text();
        if (errText.includes("Variants cannot be repeated")) {
          const signature = canonicalVariantSignature(values);
          const current = await fetchCurrentVariants();
          const repeated = current.find((v) => v?.id && v.id !== placeholderId && canonicalVariantSignature(v.values) === signature);
          if (repeated?.id) {
            await deleteVariant(repeated.id);
            await delay(600);
            updateRes = await fetch(`${API}/${storeId}/products/${nsProductId}/variants/${placeholderId}`, {
              method: "PUT",
              headers: nsHeaders(accessToken),
              body: JSON.stringify(payload),
            });
          }
        }
      }

      if (updateRes.ok) {
        reusedPlaceholder = 1;
      } else {
        const errText = await updateRes.text();
        console.error("apply-variations: falha ao atualizar placeholder", values.map((x) => x.pt).join("/"), updateRes.status, errText);
        errors.push(`${values.map((x) => x.pt).join("/")}: ${updateRes.status} ${errText}`);
      }
      await delay(180);
    }

    let existingBySignature = new Map<string, any>();
    const refreshExistingSignatures = async () => {
      const current = await fetchCurrentVariants();
      existingBySignature = new Map(current.map((variant) => [canonicalVariantSignature(variant.values), variant]));
    };
    await refreshExistingSignatures();

    for (const v of variantsToCreate) {
      const payload: any = makeVariantPayload(v, anyColor, anyMaterial);
      const values = payload.values;
      const signature = canonicalVariantSignature(values);

      const existing = existingBySignature.get(signature);
      if (existing?.id) {
        const updateExistingRes = await fetch(`${API}/${storeId}/products/${nsProductId}/variants/${existing.id}`, {
          method: "PUT",
          headers: nsHeaders(accessToken),
          body: JSON.stringify(payload),
        });
        if (updateExistingRes.ok) {
          reusedExisting++;
          await new Promise((res) => setTimeout(res, 120));
          continue;
        }
        console.warn("apply-variations: combinação já existia, mas falhou ao atualizar", signature, updateExistingRes.status, await updateExistingRes.text());
      }

      const r = await fetch(`${API}/${storeId}/products/${nsProductId}/variants`, {
        method: "POST",
        headers: nsHeaders(accessToken),
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        created++;
        existingBySignature.set(signature, await r.json());
      } else {
        const errText = await r.text();
        if (r.status === 422 && errText.includes("Variants cannot be repeated")) {
          await refreshExistingSignatures();
          const repeated = existingBySignature.get(signature);
          if (repeated?.id) {
            const updateRepeatedRes = await fetch(`${API}/${storeId}/products/${nsProductId}/variants/${repeated.id}`, {
              method: "PUT",
              headers: nsHeaders(accessToken),
              body: JSON.stringify(payload),
            });
            if (updateRepeatedRes.ok) {
              reusedExisting++;
              console.log("apply-variations: variante repetida reaproveitada", signature);
              await delay(120);
              continue;
            }
          } else {
            // Última defesa: a combinação repetida pode estar em uma página que
            // a API ainda não devolveu após delete. Aguarda, atualiza o mapa e
            // só então considera erro real.
            await delay(1000);
            await refreshExistingSignatures();
            const lateRepeated = existingBySignature.get(signature);
            if (lateRepeated?.id) {
              const updateLateRepeatedRes = await fetch(`${API}/${storeId}/products/${nsProductId}/variants/${lateRepeated.id}`, {
                method: "PUT",
                headers: nsHeaders(accessToken),
                body: JSON.stringify(payload),
              });
              if (updateLateRepeatedRes.ok) {
                reusedExisting++;
                console.log("apply-variations: variante repetida tardia reaproveitada", signature);
                await delay(120);
                continue;
              }
            }
          }
        }
        console.error("apply-variations: falha ao criar variante", values.map((x) => x.pt).join("/"), r.status, errText);
        errors.push(`${values.map((x) => x.pt).join("/")}: ${r.status} ${errText}`);
      }
      await delay(120);
    }

    const applied = created + reusedPlaceholder + reusedExisting;
    console.log("apply-variations: aplicadas=", applied, "criadas=", created, "placeholder=", reusedPlaceholder, "existentes=", reusedExisting, "de", allVariants.length, "erros=", errors.length);

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
      JSON.stringify({ success: true, created: applied, deleted: oldIds.length - reusedPlaceholder - reusedExisting, product_url: productUrl, errors: errors.slice(0, 5) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("apply-variations error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});