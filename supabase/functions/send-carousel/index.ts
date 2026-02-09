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

    // Build UAZAPI carousel payload
    const requestBody = {
      number: formattedPhone,
      text: text || "",
      carousel: carousel.map((card) => ({
        header: card.header || "",
        body: card.body || "",
        footer: card.footer || "",
        image: card.image || "",
        buttons: card.buttons.map((btn) => {
          if (btn.type === "url") {
            return { type: "url", title: btn.title, url: btn.url || "" };
          }
          return { type: "reply", title: btn.title, id: btn.id || btn.title };
        }),
      })),
    };

    console.log("Sending carousel to:", formattedPhone);
    console.log("Payload:", JSON.stringify(requestBody));

    const uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/send/carousel`, {
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
