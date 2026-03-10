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

    // Try different endpoints to check instance status
    // UAZAPI v2 uses /status or / for basic connectivity check
    const endpoints = ["/status", "/instance/status", "/"];
    let connected = false;
    let instanceData: Record<string, unknown> = {};

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${UAZAPI_SERVER_URL}${endpoint}`);
        const response = await fetch(`${UAZAPI_SERVER_URL}${endpoint}`, {
          method: "GET",
          headers: {
            "token": UAZAPI_INSTANCE_TOKEN,
          },
        });

        const responseText = await response.text();
        console.log(`Response from ${endpoint}:`, response.status, responseText.substring(0, 200));

        if (response.ok) {
          try {
            instanceData = JSON.parse(responseText);
          } catch {
            instanceData = { raw: responseText };
          }
          connected = true;
          break;
        }
      } catch (e) {
        console.log(`Error on ${endpoint}:`, e.message);
      }
    }

    if (connected) {
      const data = instanceData as Record<string, unknown>;
      
      // Extract nested status info from UAZAPI v2 response
      const checkedInstance = (data.status as Record<string, unknown>)?.checked_instance as Record<string, unknown> | undefined;
      const isHealthy = checkedInstance?.is_healthy || data.server_status === "running";
      const instanceName = checkedInstance?.name || data.name || data.pushname;
      const connectionStatus = checkedInstance?.connection_status || data.status;
      
      return new Response(
        JSON.stringify({
          success: true,
          connected: isHealthy || connectionStatus === "connected",
          serverUrl: UAZAPI_SERVER_URL.replace(/https?:\/\//, "").split("/")[0],
          phoneNumber: data.phone || (data.wid as Record<string, unknown>)?.user || null,
          name: instanceName || null,
          status: connectionStatus || "connected",
          message: checkedInstance?.message || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // If none of the endpoints worked, the server might still be reachable
      // but just doesn't have these info endpoints. Check if we can send messages.
      return new Response(
        JSON.stringify({
          success: true,
          connected: false,
          serverUrl: UAZAPI_SERVER_URL.replace(/https?:\/\//, "").split("/")[0],
          error: "Não foi possível verificar o status. Verifique se a URL e o token estão corretos.",
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
