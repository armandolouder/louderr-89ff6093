import { createServiceClient } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Gera sugestões de conteúdo/SEO para um produto usando Groq Cloud AI.
// Não salva nada — apenas retorna sugestões para o usuário revisar.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY não configurada");

    const supabase = createServiceClient();
    const body = await req.json();
    const productUuid: string | undefined = body?.product_id;
    if (!productUuid) throw new Error("product_id é obrigatório");

    const { data: prod, error: prodErr } = await supabase
      .from("catalog_products")
      .select("id, name, description, category, brand, handle, raw, catalog_images(id, image_url, position)")
      .eq("id", productUuid)
      .single();
    if (prodErr || !prod) throw new Error("Produto não encontrado");

    const images = ((prod as any).catalog_images || [])
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

    const raw = (prod as any).raw || {};
    const currentTags = raw.tags || "";

    const systemPrompt = `Você é um especialista em e-commerce de moda e SEO para lojas Nuvemshop (PT-BR).
Recebe os dados de uma camiseta e gera conteúdo otimizado, natural e atraente em português do Brasil.
Responda APENAS com um JSON válido, sem markdown e sem explicações, no formato exato:
{
  "name": "nome do produto curto e atraente",
  "description": "<p>descrição completa em HTML seguindo a ESTRUTURA OBRIGATÓRIA abaixo</p>",
  "tags": "tag1, tag2, tag3, tag4, tag5",
  "seo_title": "título SEO até 60 caracteres",
  "seo_description": "descrição SEO até 155 caracteres",
  "images_alt": ["texto alternativo da imagem 1", "texto alternativo da imagem 2"]
}
Regras: tags com 5 a 8 termos relevantes; NUNCA gere, sugira ou altere URL/handle/slug do produto; images_alt deve ter exatamente ${images.length} itens, cada um descrevendo a foto correspondente da camiseta para acessibilidade e SEO.
REGRA DO seo_title: deve SEMPRE terminar com o sufixo " I LOUDER.ink" (espaço, "I", espaço, "LOUDER.ink"). O título completo (incluindo o sufixo) NÃO pode passar de 60 caracteres — encurte a parte inicial se necessário para caber. Exemplo: "Camiseta The Cure I LOUDER.ink".

ESTRUTURA OBRIGATÓRIA DO CAMPO "description" (HTML, use apenas <h2>, <h3>, <p>, <strong> e <ul>/<li>):
1. Introdução: 2 parágrafos <p> destacando estilo, conforto, qualidade, exclusividade da arte, conexão com música/cultura/identidade visual e o público que valoriza peças únicas.
2. <h2>Por que escolher nossa camiseta?</h2> seguido de <ul> com itens (cada um usando <strong> no início):
   - <strong>100% Algodão sustentável:</strong> maciez, qualidade, durabilidade e fibra natural.
   - <strong>Costuras reforçadas:</strong> resistência e acabamento.
   - <strong>Gola redonda confortável:</strong> caimento e versatilidade.
   - <strong>Estampa exclusiva em silk digital:</strong> cores, durabilidade e tamanho padrão A3 (aprox. 42x30 cm).
3. <h2>Cuidados que fazem a diferença</h2> com <p>/<ul> explicando: camiseta sem poliéster, tecido natural, qualidade da produção e possíveis pequenas variações de tonalidade por iluminação/monitor.
4. <h2>Tabela de tamanhos</h2> com <p> orientando o cliente a medir uma camiseta favorita e consultar a tabela antes da compra.
5. <h2>Política de trocas</h2> com <ul>/<p>: prazo de 7 dias corridos após o recebimento, produto sem sinais de uso, análise antes da restituição.
6. Finalização: <p> com chamada de compra reforçando autenticidade, conforto, estilo, amor pela música/arte e identidade Louder.ink.

REGRAS SEO DA DESCRIÇÃO: use naturalmente palavras-chave como "camiseta streetwear", "camiseta de banda", "camiseta estampada", "moda urbana", "camiseta 100% algodão", "camiseta unissex" — sem exagerar na repetição. Nada de texto genérico. Tom premium, criativo e persuasivo. Não use markdown, apenas HTML com as tags permitidas.`;

    const userPrompt = `Dados atuais do produto:
Nome: ${(prod as any).name || "(sem nome)"}
Categoria: ${(prod as any).category || "—"}
Marca: ${(prod as any).brand || "—"}
Descrição atual: ${((prod as any).description || "(vazia)").slice(0, 1500)}
Tags atuais: ${currentTags || "(nenhuma)"}
Quantidade de fotos: ${images.length}`;

    const callGroq = async (model: string) =>
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
      });

    // Modelo principal + fallbacks (usados quando o principal atinge rate limit/erro)
    const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    let resp: Response | null = null;
    let lastErr = "";
    for (const model of models) {
      resp = await callGroq(model);
      if (resp.ok) break;
      const txt = await resp.text();
      lastErr = `Groq ${resp.status}: ${txt}`;
      // Só tenta o próximo modelo em caso de rate limit (429)
      if (resp.status !== 429) break;
      console.warn(`Modelo ${model} atingiu rate limit, tentando fallback...`);
      resp = null;
    }
    if (!resp || !resp.ok) {
      const friendly = lastErr.includes("rate_limit") || lastErr.includes("429")
        ? "Limite diário de uso da IA (Groq) atingido. Tente novamente em alguns minutos ou faça upgrade do plano Groq."
        : lastErr;
      throw new Error(friendly);
    }
    const data = await resp.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(rawContent); } catch { parsed = {}; }

    const altArr: string[] = Array.isArray(parsed.images_alt) ? parsed.images_alt : [];
    const SUFFIX = " I LOUDER.ink";
    const enforceSeoTitle = (title: string): string => {
      // Sempre usa o NOME COMPLETO do produto como base do Título SEO.
      let base = ((prod as any).name || title || "").trim();
      // remove sufixo existente (variações) para não duplicar
      base = base.replace(/\s*[I|]\s*LOUDER\.ink\s*$/i, "").trim();
      const maxBase = 60 - SUFFIX.length;
      if (base.length > maxBase) base = base.slice(0, maxBase).trim();
      return `${base}${SUFFIX}`;
    };
    const finalSeoTitle = enforceSeoTitle(parsed.seo_title || "");
    const suggestion = {
      name: (prod as any).name || "",
      description: parsed.description || (prod as any).description || "",
      tags: parsed.tags || currentTags || "",
      seo_title: finalSeoTitle,
      seo_description: parsed.seo_description || "",
      images: images.map((img: any, i: number) => ({
        id: img.id,
        image_url: img.image_url,
        position: img.position ?? i + 1,
        alt: altArr[i] || "",
      })),
    };

    return new Response(JSON.stringify({ success: true, suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});