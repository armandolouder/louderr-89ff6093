import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const { phone, content, mediaUrl } = await req.json();

    if (!phone || !content) {
      throw new Error("phone and content are required");
    }

    // Auto-format phone
    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.length >= 10 && !formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    console.log(`Sending individual message to ${formattedPhone}, hasMedia: ${!!mediaUrl}`);

    let uazapiResponse;

    if (mediaUrl) {
      // Send media with caption
      uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/send/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_INSTANCE_TOKEN,
        },
        body: JSON.stringify({
          number: formattedPhone,
          type: "image",
          file: mediaUrl,
          text: content,
        }),
      });
    } else {
      // Send text only
      uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/send/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_INSTANCE_TOKEN,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: content,
        }),
      });
    }

    const responseText = await uazapiResponse.text();
    console.log("UAZAPI response status:", uazapiResponse.status);
    console.log("UAZAPI response:", responseText);

    if (!uazapiResponse.ok) {
      throw new Error(`UAZAPI error: ${uazapiResponse.status} - ${responseText}`);
    }

    let uazapiData;
    try {
      uazapiData = JSON.parse(responseText);
    } catch {
      uazapiData = { raw: responseText };
    }

    return new Response(
      JSON.stringify({ success: true, data: uazapiData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending individual message:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
