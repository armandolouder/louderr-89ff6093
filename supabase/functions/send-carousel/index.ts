import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CarouselCard {
  header: string;
  body: string;
  footer?: string;
  image?: string;
  buttons: Array<{
    type: "url" | "reply";
    title: string;
    url?: string;
    id?: string;
  }>;
}

interface SendCarouselRequest {
  number: string;
  text: string;
  carousel: CarouselCard[];
}

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

    const UAZAPI_SERVER_URL = Deno.env.get("UAZAPI_SERVER_URL");
    const UAZAPI_INSTANCE_TOKEN = Deno.env.get("UAZAPI_INSTANCE_TOKEN");

    if (!UAZAPI_SERVER_URL || !UAZAPI_INSTANCE_TOKEN) {
      throw new Error("UAZAPI credentials not configured");
    }

    const { number, text, carousel }: SendCarouselRequest = await req.json();

    if (!number || !carousel || carousel.length === 0) {
      throw new Error("number and carousel cards are required");
    }

    const formattedPhone = number.replace(/\D/g, "");

    // Build choices array for UAZAPI /send/menu carousel format
    // Format: each card is built with [Title\nBody], {imageUrl}, and button entries
    const choices: string[] = [];

    for (const card of carousel) {
      // Card text: [Header\nBody\nFooter]
      let cardText = card.header || "";
      if (card.body) cardText += `\n${card.body}`;
      if (card.footer) cardText += `\n${card.footer}`;
      choices.push(`[${cardText}]`);

      // Card image
      if (card.image) {
        choices.push(`{${card.image}}`);
      }

      // Buttons: "Title|url" or "Title" for reply
      for (const btn of card.buttons) {
        if (btn.type === "url" && btn.url) {
          choices.push(`${btn.title}|${btn.url}`);
        } else {
          choices.push(btn.title);
        }
      }
    }

    const requestBody = {
      number: formattedPhone,
      type: "carousel",
      text: text || "",
      choices,
    };

    console.log("Sending carousel via /send/menu to:", formattedPhone);
    console.log("Payload:", JSON.stringify(requestBody));

    const uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/send/menu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": UAZAPI_INSTANCE_TOKEN,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await uazapiResponse.text();
    console.log("UAZAPI carousel response:", uazapiResponse.status, responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!uazapiResponse.ok) {
      throw new Error(`UAZAPI error [${uazapiResponse.status}]: ${responseText}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending carousel:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
