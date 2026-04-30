import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENV_VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") ?? "louder_meta_verify_2026";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET → Verificação do webhook (Meta envia hub.challenge)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token && challenge) {
      // Aceita o token do env OU qualquer token salvo na tabela meta_credentials
      let valid = token === ENV_VERIFY_TOKEN;
      if (!valid) {
        try {
          const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
          const { data } = await supabase.rpc("find_meta_user_by_verify_token", { _token: token });
          valid = !!data;
        } catch (e) {
          console.error("[meta-webhook] token lookup failed", e);
        }
      }
      if (valid) {
        console.log("[meta-webhook] verification OK");
        return new Response(challenge, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }
    }

    console.warn("[meta-webhook] verification FAILED", { mode });
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST → Evento real da Meta
  if (req.method === "POST") {
    try {
      const payload = await req.json();
      console.log("[meta-webhook] received", JSON.stringify(payload).slice(0, 500));

      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

      // Para cada entry, salva log bruto
      const entries = Array.isArray(payload?.entry) ? payload.entry : [];
      for (const entry of entries) {
        const pageId = entry.id ? String(entry.id) : null;
        const changes = Array.isArray(entry.changes) ? entry.changes : [];
        const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];

        // Tenta resolver user_id pela página
        let userId: string | null = null;
        if (pageId) {
          const { data: integ } = await supabase
            .from("meta_integrations")
            .select("user_id")
            .eq("page_id", pageId)
            .maybeSingle();
          userId = integ?.user_id ?? null;
        }

        // Insere o evento no log
        await supabase.from("meta_webhook_events").insert({
          user_id: userId,
          object_type: payload.object ?? null,
          event_type: changes[0]?.field ?? (messaging.length ? "messaging" : null),
          page_id: pageId,
          payload: entry,
        });
      }

      // Meta exige resposta 200 rápida
      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    } catch (err) {
      console.error("[meta-webhook] error", err);
      // Retorna 200 para Meta não reentregar — log já capturou erro
      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
});