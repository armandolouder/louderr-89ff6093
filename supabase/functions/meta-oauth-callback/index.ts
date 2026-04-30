import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const APP_REDIRECT_BASE = "https://louderr.lovable.app/admin/api";
const REDIRECT_URI = "https://ynawiygjzkypuvenvroi.supabase.co/functions/v1/meta-oauth-callback";
const GRAPH = "https://graph.facebook.com/v21.0";

function htmlPage(title: string, message: string, success = true): string {
  const color = success ? "#10b981" : "#ef4444";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#0a0a0a; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
    .card { background:#111; border:1px solid #222; padding:40px; max-width:480px; text-align:center; }
    h1 { color:${color}; margin:0 0 12px; font-size:20px; }
    p { color:#aaa; line-height:1.5; }
    a { color:#fff; text-decoration:underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <p><a href="${APP_REDIRECT_BASE}">Voltar para Integrações</a></p>
  </div>
  <script>setTimeout(() => { window.location.href = "${APP_REDIRECT_BASE}"; }, 4000);</script>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return new Response(
      htmlPage("Conexão cancelada", errorDescription ?? error, false),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (!code || !stateParam) {
    return new Response(
      htmlPage(
        "Endpoint OAuth da Meta",
        "Esta URL é o Redirect URI do Facebook Login. Inicie a conexão pela página de Integrações.",
        true
      ),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Validate state -> get user_id
    const { data: stateRow } = await supabase
      .from("meta_oauth_states")
      .select("user_id, expires_at")
      .eq("state", stateParam)
      .maybeSingle();

    if (!stateRow) throw new Error("State inválido ou expirado. Tente novamente.");
    if (new Date(stateRow.expires_at) < new Date()) throw new Error("State expirado.");
    const userId = stateRow.user_id as string;

    // 2. Get user's app credentials
    const { data: creds } = await supabase
      .from("meta_credentials")
      .select("app_id, app_secret")
      .eq("user_id", userId)
      .maybeSingle();

    if (!creds?.app_id || !creds?.app_secret) {
      throw new Error("Credenciais do app não encontradas. Salve App ID e Secret antes de conectar.");
    }

    // 3. Exchange code -> short-lived user token
    const tokenResp = await fetch(
      `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        client_id: creds.app_id,
        client_secret: creds.app_secret,
        redirect_uri: REDIRECT_URI,
        code,
      })
    );
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) throw new Error(tokenData.error?.message || "Falha ao trocar código.");

    // 4. Exchange to long-lived (~60 days)
    const longResp = await fetch(
      `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: creds.app_id,
        client_secret: creds.app_secret,
        fb_exchange_token: tokenData.access_token,
      })
    );
    const longData = await longResp.json();
    const userAccessToken = longData.access_token || tokenData.access_token;

    // 5. Get user info
    const meResp = await fetch(`${GRAPH}/me?fields=id,name&access_token=${userAccessToken}`);
    const me = await meResp.json();

    // 6. Get pages with IG accounts
    const pagesResp = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${userAccessToken}`
    );
    const pagesData = await pagesResp.json();
    const pages = pagesData.data || [];
    if (pages.length === 0) throw new Error("Nenhuma página do Facebook encontrada nesta conta.");

    // 7. Save each page (prefer ones with IG)
    const sorted = pages.sort((a: any, b: any) =>
      (b.instagram_business_account ? 1 : 0) - (a.instagram_business_account ? 1 : 0)
    );

    for (const page of sorted) {
      // Fallback: se IG não veio na query inicial, busca direto via page access token
      let igId = page.instagram_business_account?.id || null;
      let igUsername = page.instagram_business_account?.username || null;
      if (!igId) {
        try {
          const igResp = await fetch(
            `${GRAPH}/${page.id}?fields=instagram_business_account{id,username},connected_instagram_account{id,username}&access_token=${page.access_token}`
          );
          const igData = await igResp.json();
          igId = igData.instagram_business_account?.id || igData.connected_instagram_account?.id || null;
          igUsername = igData.instagram_business_account?.username || igData.connected_instagram_account?.username || null;
          console.log("IG fallback for page", page.id, ":", igData);
        } catch (e) {
          console.error("IG fallback failed:", e);
        }
      }

      await supabase.from("meta_integrations").upsert({
        user_id: userId,
        facebook_user_id: me.id,
        facebook_user_name: me.name,
        page_id: page.id,
        page_name: page.name,
        page_access_token: page.access_token,
        instagram_business_account_id: igId,
        instagram_username: igUsername,
        scopes: ["instagram_basic", "instagram_manage_messages", "instagram_manage_comments", "pages_messaging", "pages_show_list", "business_management"],
        status: "active",
        webhook_subscribed: false,
        last_sync_at: new Date().toISOString(),
      }, { onConflict: "user_id,page_id" });

      // 8. Subscribe page to webhooks (messages + feed)
      try {
        await fetch(`${GRAPH}/${page.id}/subscribed_apps`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            subscribed_fields: "messages,messaging_postbacks,feed",
            access_token: page.access_token,
          }),
        });
        await supabase
          .from("meta_integrations")
          .update({ webhook_subscribed: true })
          .eq("user_id", userId)
          .eq("page_id", page.id);
      } catch (e) {
        console.error("Subscribe failed for page", page.id, e);
      }
    }

    // Cleanup state
    await supabase.from("meta_oauth_states").delete().eq("state", stateParam);

    const igCount = pages.filter((p: any) => p.instagram_business_account).length;
    return new Response(
      htmlPage(
        "✅ Conectado com sucesso!",
        `${pages.length} página(s) vinculada(s) — ${igCount} com Instagram Business. Você já pode receber DMs e comentários.`,
        true
      ),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (e: any) {
    console.error("OAuth error:", e);
    return new Response(
      htmlPage("Erro na conexão", e.message || "Erro desconhecido", false),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }
});