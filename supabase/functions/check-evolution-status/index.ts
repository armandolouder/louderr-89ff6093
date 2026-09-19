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

    console.log(`Checking Evolution instance: ${EVOLUTION_INSTANCE}`);

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
      return new Response(
        JSON.stringify({ success: false, connected: false, error: "Evolution API credentials not configured in secrets" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = EVOLUTION_API_URL.endsWith("/") ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;
    const headers = { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" };
    const stateResponse = await fetch(
      `${baseUrl}/instance/connectionState/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
      { headers },
    );
    const stateRaw = await stateResponse.text();
    let stateData: any = null;
    try { stateData = JSON.parse(stateRaw); } catch { stateData = null; }

    if (!stateResponse.ok) {
      console.error(`Evolution connectionState failed [${stateResponse.status}]: ${stateRaw.substring(0, 500)}`);
      return new Response(JSON.stringify({
        success: false,
        connected: false,
        serverOnline: true,
        channelReady: false,
        status: "unavailable",
        name: EVOLUTION_INSTANCE,
        provider: "evolution",
        error: "O servidor respondeu, mas não foi possível consultar esta instância.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reportedOpen = stateData?.instance?.state === "open";
    let channelReady = false;
    let phoneNumber: string | undefined;
    let channelError: string | undefined;

    if (reportedOpen) {
      const instancesResponse = await fetch(
        `${baseUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(EVOLUTION_INSTANCE)}`,
        { headers },
      );
      if (instancesResponse.ok) {
        const instancesData = await instancesResponse.json().catch(() => null);
        const instance = Array.isArray(instancesData) ? instancesData[0] : instancesData;
        const ownerJid = instance?.ownerJid || instance?.instance?.ownerJid;
        phoneNumber = typeof ownerJid === "string" ? ownerJid.split("@")[0].split(":")[0] : undefined;
      }

      if (phoneNumber) {
        const probeResponse = await fetch(
          `${baseUrl}/chat/whatsappNumbers/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
          { method: "POST", headers, body: JSON.stringify({ numbers: [phoneNumber] }) },
        );
        const probeRaw = await probeResponse.text();
        channelReady = probeResponse.ok;
        if (!probeResponse.ok) {
          console.error(`Evolution channel probe failed [${probeResponse.status}]: ${probeRaw.substring(0, 500)}`);
          channelError = probeRaw.toLowerCase().includes("connection closed")
            ? "A Evolution informa conexão aberta, mas o canal do WhatsApp está fechado."
            : "A instância aparece conectada, mas o canal não respondeu ao teste.";
        }
      } else {
        channelError = "A instância aparece conectada, mas não informou o número para validar o canal.";
      }
    }

    const connected = reportedOpen && channelReady;
    return new Response(JSON.stringify({
      success: connected,
      connected,
      serverOnline: true,
      channelReady,
      unstable: reportedOpen && !channelReady,
      serverUrl: EVOLUTION_API_URL.replace(/https?:\/\//, "").split("/")[0],
      phoneNumber,
      name: EVOLUTION_INSTANCE,
      status: connected ? "open" : reportedOpen ? "unstable" : (stateData?.instance?.state || "disconnected"),
      provider: "evolution",
      error: channelError || (!reportedOpen ? "A instância não está conectada ao WhatsApp." : undefined),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error checking Evolution status:", error);
    return new Response(
      JSON.stringify({ success: false, connected: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});