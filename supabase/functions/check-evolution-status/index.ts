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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const anonClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));

    const EVOLUTION_API_URL = body.evolution_url || Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = body.evolution_key || Deno.env.get("EVOLUTION_API_KEY");
    const EVOLUTION_INSTANCE = body.evolution_instance || Deno.env.get("EVOLUTION_ACTIVE_INSTANCE") || Deno.env.get("EVOLUTION_INSTANCE_NAME");

    console.log(`Evolution Config - URL: ${EVOLUTION_API_URL}, Instance: ${EVOLUTION_INSTANCE}`);

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
      return new Response(
        JSON.stringify({ success: false, connected: false, error: "Evolution API credentials not configured in secrets" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = EVOLUTION_API_URL.endsWith("/") ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;
    const endpoints = [
      `/instance/connectionState/${EVOLUTION_INSTANCE}`,
      `/instance/fetchInstances?instanceName=${EVOLUTION_INSTANCE}`,
      `/instance/status/${EVOLUTION_INSTANCE}`,
      `/instance/info/${EVOLUTION_INSTANCE}`,
    ];

    let lastData = null;
    let isConnected = false;

    for (const endpoint of endpoints) {
      try {
        const checkUrl = `${baseUrl}${endpoint}`;
        console.log(`Trying Evolution endpoint: ${checkUrl}`);
        const response = await fetch(checkUrl, { headers: { apikey: EVOLUTION_API_KEY } });
        if (response.ok) {
          const data = await response.json();
          console.log(`Evolution response from ${endpoint}:`, JSON.stringify(data));
          lastData = data;
          isConnected =
            data.instance?.state === "open" ||
            data.status === "open" ||
            data.state === "open" ||
            data.instance?.status === "connected" ||
            data.instance?.connected === true ||
            data.connected === true;
          if (isConnected) break;
        }
      } catch (e) {
        console.log(`Error on Evolution endpoint ${endpoint}:`, e.message);
      }
    }

    if (isConnected || lastData) {
      return new Response(
        JSON.stringify({
          success: true,
          connected: isConnected,
          serverUrl: EVOLUTION_API_URL.replace(/https?:\/\//, "").split("/")[0],
          name: EVOLUTION_INSTANCE,
          status: isConnected ? "open" : (lastData?.instance?.state || "disconnected"),
          provider: "evolution",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, connected: false, error: "Não foi possível obter o status da instância Evolution." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking Evolution status:", error);
    return new Response(
      JSON.stringify({ success: false, connected: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});