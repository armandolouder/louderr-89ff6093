import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH = "https://graph.facebook.com/v21.0";
const INSTAGRAM_GRAPH = "https://graph.instagram.com/v21.0";

type Integration = {
  id: string;
  user_id: string;
  page_id: string;
  page_name: string | null;
  page_access_token: string;
  instagram_business_account_id: string | null;
};

async function readJsonSafe(resp: Response) {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

async function subscribePageWebhooks(pageId: string, pageAccessToken: string) {
  const resp = await fetch(`${GRAPH}/${pageId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      subscribed_fields: "messages,messaging_postbacks,feed",
      access_token: pageAccessToken,
    }),
  });

  const data = await readJsonSafe(resp);
  if (!resp.ok || data?.error) {
    throw new Error(data?.error?.message || `Falha ao inscrever webhooks da página (${resp.status})`);
  }
}

async function subscribeInstagramWebhooks(igId: string | null, pageAccessToken: string) {
  const targets = [
    igId ? `${INSTAGRAM_GRAPH}/${igId}/subscribed_apps` : null,
    `${INSTAGRAM_GRAPH}/me/subscribed_apps`,
  ].filter(Boolean) as string[];

  let lastError: string | null = null;

  for (const target of targets) {
    const resp = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        subscribed_fields: "comments,messages,mentions,live_comments",
        access_token: pageAccessToken,
      }),
    });

    const data = await readJsonSafe(resp);
    if (resp.ok && !data?.error) return;
    lastError = data?.error?.message || `Falha ao inscrever webhooks do Instagram (${resp.status})`;
  }

  throw new Error(lastError || "Falha ao inscrever webhooks do Instagram");
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

      try {
        await subscribePageWebhooks(integration.page_id, integration.page_access_token);
        pageOk = true;
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      if (pageOk && integration.instagram_business_account_id) {
        try {
          await subscribeInstagramWebhooks(integration.instagram_business_account_id, integration.page_access_token);
          instagramOk = true;
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : String(error);
        }
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