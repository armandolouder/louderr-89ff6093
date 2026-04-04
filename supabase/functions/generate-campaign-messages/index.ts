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

    const { clusterName, clusterDescription, objective, recommendation, messageCount = 3 } = await req.json();
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em marketing e copywriting para WhatsApp. Sua tarefa é criar mensagens de marketing personalizadas e persuasivas para campanhas de WhatsApp.

Regras importantes:
- Mensagens devem ser curtas (máximo 300 caracteres)
- Use linguagem informal e amigável (brasileiro)
- Inclua um call-to-action claro
- Personalize usando {{nome}} como placeholder para o nome do cliente
- Crie variações diferentes que transmitam a mesma ideia
- Use emojis com moderação (1-2 por mensagem)
- NÃO use links genéricos, apenas mencione "clique no link" ou similar
- Foque no benefício para o cliente`;

    const userPrompt = `Crie ${messageCount} variações de mensagem de WhatsApp para a seguinte campanha:

**Segmento de clientes:** ${clusterName}
**Descrição do segmento:** ${clusterDescription || "Clientes gerais"}
**Objetivo da campanha:** ${objective || "Engajar clientes"}
**Recomendação estratégica:** ${recommendation || "Oferecer promoções personalizadas"}

Retorne as mensagens em formato JSON com a seguinte estrutura:
{
  "messages": [
    { "content": "mensagem 1 aqui", "variant": "A" },
    { "content": "mensagem 2 aqui", "variant": "B" },
    { "content": "mensagem 3 aqui", "variant": "C" }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_messages",
              description: "Generate campaign messages for WhatsApp",
              parameters: {
                type: "object",
                properties: {
                  messages: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        content: { type: "string", description: "The message content" },
                        variant: { type: "string", description: "The variant label (A, B, C, etc)" },
                      },
                      required: ["content", "variant"],
                    },
                  },
                },
                required: ["messages"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_messages" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content directly
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("Failed to parse AI response");
  } catch (error) {
    console.error("Error generating messages:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
