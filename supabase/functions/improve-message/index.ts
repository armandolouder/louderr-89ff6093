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
    const { message, mode, customerName } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt: string;

    if (mode === "generate") {
      systemPrompt = `Você é um vendedor brasileiro super simpático e natural. Gere uma mensagem curta de WhatsApp para enviar a um cliente${customerName ? ` chamado ${customerName}` : ""}. 
A mensagem deve ser:
- Muito natural, como se fosse um amigo batendo um papo
- Sem parecer que está vendendo algo
- Curta (máximo 3-4 linhas)
- Use linguagem informal brasileira
- Pode usar emoji com moderação (1-2 no máximo)
- Não use palavras como "promoção", "desconto", "oferta", "imperdível"
- Pareça genuíno, como se realmente se importasse com a pessoa

Retorne APENAS o texto da mensagem, sem aspas, sem explicação.`;
    } else {
      systemPrompt = `Você é um especialista em comunicação natural brasileira. Melhore a mensagem de WhatsApp abaixo para que pareça:
- Mais natural e humana, como um amigo conversando
- Sem tom de vendas ou marketing
- Mantenha a essência e informação original
- Use linguagem informal brasileira
- Pode usar emoji com moderação (1-2 no máximo)  
- Curta e direta
- Genuína e simpática

Retorne APENAS o texto melhorado, sem aspas, sem explicação.`;
    }

    const userMessage = mode === "generate"
      ? "Gere uma mensagem simpática e natural para iniciar uma conversa com o cliente."
      : `Melhore esta mensagem:\n\n${message}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI error: ${err}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ success: true, message: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
