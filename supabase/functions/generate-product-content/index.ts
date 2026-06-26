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
  "description": "<p>descrição em HTML simples (parágrafos, listas), persuasiva e informativa</p>",
  "tags": "tag1, tag2, tag3, tag4, tag5",
  "seo_title": "título SEO até 60 caracteres",
  "seo_description": "descrição SEO até 155 caracteres",
  "handle": "url-amigavel-sem-acentos-com-hifens",
  "images_alt": ["texto alternativo da imagem 1", "texto alternativo da imagem 2"]
}
Regras: tags com 5 a 8 termos relevantes; handle em minúsculas, sem acentos, palavras separadas por hífen; images_alt deve ter exatamente ${images.length} itens, cada um descrevendo a foto correspondente da camiseta para acessibilidade e SEO.`;

    const userPrompt = `Dados atuais do produto:
Nome: ${(prod as any).name || "(sem nome)"}
Categoria: ${(prod as any).category || "—"}
Marca: ${(prod as any).brand || "—"}
Descrição atual: ${((prod as any).description || "(vazia)").slice(0, 1500)}
Tags atuais: ${currentTags || "(nenhuma)"}
Quantidade de fotos: ${images.length}`;

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Groq ${resp.status}: ${txt}`);
    }
    const data = await resp.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(rawContent); } catch { parsed = {}; }

    const altArr: string[] = Array.isArray(parsed.images_alt) ? parsed.images_alt : [];
    const suggestion = {
      name: parsed.name || (prod as any).name || "",
      description: parsed.description || (prod as any).description || "",
      tags: parsed.tags || currentTags || "",
      seo_title: parsed.seo_title || "",
      seo_description: parsed.seo_description || "",
      handle: parsed.handle || (prod as any).handle || "",
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