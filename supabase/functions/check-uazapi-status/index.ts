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
      return new Response(
        JSON.stringify({ 
          success: false, 
          connected: false,
          error: "UAZAPI credentials not configured in secrets" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking UAZAPI status at: ${UAZAPI_SERVER_URL}`);

    // Try to get instance info from UAZAPI
    const response = await fetch(`${UAZAPI_SERVER_URL}/instance/info`, {
      method: "GET",
      headers: {
        "token": UAZAPI_INSTANCE_TOKEN,
      },
    });

    const responseText = await response.text();
    console.log("UAZAPI status response:", response.status, responseText);

    if (response.ok) {
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      return new Response(
        JSON.stringify({
          success: true,
          connected: true,
          serverUrl: UAZAPI_SERVER_URL.replace(/https?:\/\//, "").split("/")[0],
          phoneNumber: data.phone || data.wid?.user || null,
          name: data.pushname || data.name || null,
          status: data.status || "connected",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          connected: false,
          serverUrl: UAZAPI_SERVER_URL.replace(/https?:\/\//, "").split("/")[0],
          error: `API returned status ${response.status}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error checking UAZAPI status:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        connected: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
