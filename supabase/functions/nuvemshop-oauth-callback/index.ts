import { createServiceClient } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { NUVEMSHOP_USER_AGENT } from "../_shared/nuvemshop.ts";

function htmlPage(title: string, message: string, ok: boolean): Response {
  const color = ok ? "#16a34a" : "#dc2626";
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b0c;color:#e5e5e5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{max-width:440px;padding:40px;text-align:center}
  .badge{width:64px;height:64px;border-radius:0;background:${color};display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:32px;color:#fff}
  h1{font-size:20px;margin:0 0 12px}
  p{color:#9ca3af;line-height:1.5;font-size:14px}
</style></head>
<body><div class="card"><div class="badge">${ok ? "✓" : "!"}</div>
<h1>${title}</h1><p>${message}</p>
${ok ? '<p>Você já pode fechar esta aba e voltar ao painel para sincronizar o catálogo.</p>' : ''}
</div></body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) {
      return htmlPage("Código ausente", "A Nuvemshop não enviou o código de autorização. Tente instalar o app novamente.", false);
    }

    const clientId = Deno.env.get("NUVEMSHOP_APP_ID");
    const clientSecret = Deno.env.get("NUVEMSHOP_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return htmlPage("Configuração incompleta", "App ID ou Client Secret da Nuvemshop não configurados.", false);
    }

    // Troca o código pelo access token (endpoint global da Tiendanube/Nuvemshop)
    const tokenResp = await fetch("https://www.tiendanube.com/apps/authorize/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": NUVEMSHOP_USER_AGENT },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
      }),
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenResp.status, tokenData);
      return htmlPage("Falha na autorização", `Não foi possível obter o token (${tokenResp.status}). ${tokenData.error_description || tokenData.error || ""}`, false);
    }

    const storeId = String(tokenData.user_id);
    const accessToken = tokenData.access_token as string;
    const scope = tokenData.scope as string | undefined;

    const supabase = createServiceClient();
    const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
    const ownerUserId = ownerData as string | null;

    // Busca o nome da loja
    let storeName: string | null = null;
    try {
      const storeResp = await fetch(`https://api.tiendanube.com/v1/${storeId}/store`, {
        headers: { "Authentication": `bearer ${accessToken}`, "User-Agent": NUVEMSHOP_USER_AGENT },
      });
      if (storeResp.ok) {
        const store = await storeResp.json();
        storeName = store?.name?.pt || store?.name?.es || store?.name || null;
      }
    } catch (_) { /* opcional */ }

    const { error } = await supabase.from("nuvemshop_credentials").upsert({
      store_id: storeId,
      access_token: accessToken,
      store_name: storeName,
      scope: scope ?? null,
      user_id: ownerUserId,
    }, { onConflict: "store_id" });

    if (error) {
      console.error("Erro ao salvar credenciais:", error.message);
      return htmlPage("Erro ao salvar", "O token foi obtido, mas não foi possível salvá-lo no banco. Tente novamente.", false);
    }

    return htmlPage("Conexão realizada!", `Loja conectada com sucesso${storeName ? `: <strong>${storeName}</strong>` : ""} (ID ${storeId}).`, true);
  } catch (error: any) {
    console.error("nuvemshop-oauth-callback error:", error);
    return htmlPage("Erro inesperado", error.message || "Falha ao processar a autorização.", false);
  }
});