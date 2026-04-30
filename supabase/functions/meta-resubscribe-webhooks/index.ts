import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH = "https://graph.facebook.com/v21.0";

type Integration = {
  id: string;
  user_id: string;
  page_id: string;
  page_name: string | null;
  page_access_token: string;
  instagram_business_account_id: string | null;
};

const REQUIRED_PAGE_PERMISSIONS = [
  "pages_manage_metadata",
  "pages_messaging",
  "pages_read_engagement",
];
const REQUIRED_IG_PERMISSIONS = [
  "instagram_basic",
  "instagram_manage_messages",
  "instagram_manage_comments",
];

async function readJsonSafe(resp: Response) {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

async function fetchTokenPermissions(token: string): Promise<{ granted: Set<string>; declined: Set<string>; valid: boolean; error: string | null }> {
  // /me/permissions returns permissions of the USER token. For PAGE access tokens
  // we use debug_token to check granular_scopes / scopes attached to the token.
  const debugResp = await fetch(`${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`);
  const debugData = await readJsonSafe(debugResp);

  if (!debugResp.ok || debugData?.error) {
    return {
      granted: new Set(),
      declined: new Set(),
      valid: false,
      error: debugData?.error?.message || `debug_token failed (${debugResp.status})`,
    };
  }

  const data = debugData?.data ?? {};
  const isValid = data?.is_valid === true;
  const scopes: string[] = Array.isArray(data?.scopes) ? data.scopes : [];
  const granular: any[] = Array.isArray(data?.granular_scopes) ? data.granular_scopes : [];
  const granted = new Set<string>(scopes);
  for (const g of granular) {
    if (g?.scope) granted.add(g.scope);
  }

  return {
    granted,
    declined: new Set(),
    valid: isValid,
    error: isValid ? null : (data?.error?.message || "Token inválido ou expirado"),
  };
}

function missingPerms(required: string[], granted: Set<string>): string[] {
  return required.filter((p) => !granted.has(p));
}

async function subscribePageWebhooks(pageId: string, pageAccessToken: string) {
  const resp = await fetch(`${GRAPH}/${pageId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      subscribed_fields: "messages,messaging_postbacks,messaging_handovers,feed,mention,message_reactions",
      access_token: pageAccessToken,
    }),
  });

  const data = await readJsonSafe(resp);
  if (!resp.ok || data?.error) {
    throw new Error(data?.error?.message || `Falha ao inscrever webhooks da página (${resp.status})`);
  }
}

function explainMetaCapabilityError(message: string) {
  if (!/(#3)|Application does not have the capability to make this API call/i.test(message)) {
    return message;
  }

  return "A Meta bloqueou esta chamada porque o app ainda não tem capability liberada para este recurso. Verifique se o app está em modo Live e com App Review/Advanced Access aprovado para pages_manage_metadata, pages_messaging, instagram_manage_messages e instagram_manage_comments.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: integrations, error: integrationsError } = await supabase
      .from("meta_integrations")
      .select("id,user_id,page_id,page_name,page_access_token,instagram_business_account_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active");

    if (integrationsError) throw integrationsError;

    const results = [] as Array<{ page_id: string; page_name: string | null; success: boolean; error: string | null }>;

    for (const integration of (integrations as Integration[]) ?? []) {
      let pageOk = false;
      let instagramOk = !integration.instagram_business_account_id;
      let errorMessage: string | null = null;
      let skippedPage = false;
      let skippedInstagram = false;

      // 1) Pre-check: validate token & required permissions before any subscribe call
      const perms = await fetchTokenPermissions(integration.page_access_token);

      if (!perms.valid) {
        errorMessage = `Token inválido para "${integration.page_name ?? integration.page_id}": ${perms.error ?? "desconhecido"}. Reconecte via "Conectar com Facebook".`;
        skippedPage = true;
        skippedInstagram = !!integration.instagram_business_account_id;
      } else {
        const missingPage = missingPerms(REQUIRED_PAGE_PERMISSIONS, perms.granted);
        if (missingPage.length > 0) {
          errorMessage = `Permissões da Página ausentes: ${missingPage.join(", ")}. Aprove no App Review da Meta e reconecte.`;
          skippedPage = true;
        }

        if (integration.instagram_business_account_id) {
          const missingIg = missingPerms(REQUIRED_IG_PERMISSIONS, perms.granted);
          if (missingIg.length > 0) {
            const igMsg = `Permissões do Instagram ausentes: ${missingIg.join(", ")}. Aprove no App Review da Meta.`;
            errorMessage = errorMessage ? `${errorMessage} | ${igMsg}` : igMsg;
            skippedInstagram = true;
          } else {
            instagramOk = true;
          }
        }
      }

      try {
        if (skippedPage) throw new Error(errorMessage || "Subscrição da Página bloqueada por pré-verificação");
        await subscribePageWebhooks(integration.page_id, integration.page_access_token);
        pageOk = true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errorMessage = errorMessage && skippedPage ? errorMessage : explainMetaCapabilityError(msg);
      }

      if (pageOk && integration.instagram_business_account_id && skippedInstagram) {
        errorMessage = errorMessage || "Subscrição do Instagram bloqueada por pré-verificação";
      }

      const success = pageOk && instagramOk;

      await supabase
        .from("meta_integrations")
        .update({
          webhook_subscribed: success,
          last_sync_at: new Date().toISOString(),
          metadata: {
            webhook_last_resubscribe_at: new Date().toISOString(),
            webhook_last_resubscribe_error: errorMessage,
            webhook_last_permissions: Array.from(perms.granted),
            webhook_token_valid: perms.valid,
            webhook_instagram_subscription_mode: integration.instagram_business_account_id ? "app_dashboard" : null,
          },
        })
        .eq("id", integration.id);

      results.push({
        page_id: integration.page_id,
        page_name: integration.page_name,
        success,
        error: errorMessage,
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});