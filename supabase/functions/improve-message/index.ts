import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { message, mode, customerName, variants = 1 } = await req.json();
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");

    let systemPrompt: string;

    systemPrompt = `Você é um assistente de escrita para mensagens de WhatsApp. Sua tarefa é APENAS corrigir erros de português, gramática e pontuação da mensagem fornecida, mantendo o tom original do usuário.
Não adicione informações extras, não dê opções fora de contexto e não mude drasticamente o estilo.
Apenas acerte o texto para que fique correto e profissional, mas natural.

Responda APENAS com um JSON válido no formato: {"variants":["texto corrigido"]}. Sem markdown, sem explicação, sem \`\`\`.`;

    const userMessage = `Corrija este texto:\n\n${message}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 800,
        temperature: 0.9,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq error: ${err}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "{}";

    let variantsArr: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      variantsArr = Array.isArray(parsed.variants) ? parsed.variants.map((s: any) => String(s).trim()).filter(Boolean) : [];
    } catch {
      variantsArr = [raw];
    }

    if (variantsArr.length === 0) variantsArr = [raw];

    return new Response(JSON.stringify({ success: true, variants: variantsArr, message: variantsArr[0] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
