const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const APP_REDIRECT_BASE = "https://louderr.lovable.app/admin/api";

function htmlPage(title: string, message: string, success = true): string {
  const color = success ? "#10b981" : "#ef4444";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
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
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return new Response(
      htmlPage("Conexão cancelada", errorDescription ?? error, false),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (!code) {
    return new Response(
      htmlPage(
        "Endpoint OAuth da Meta",
        "Esta URL deve ser configurada como Redirect URI no Facebook Login. Aguardando configuração de App ID e App Secret.",
        true
      ),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // TODO: trocar code por access_token quando META_APP_ID e META_APP_SECRET forem configurados
  return new Response(
    htmlPage(
      "Código recebido",
      "OAuth pré-configurado com sucesso. Configure META_APP_ID e META_APP_SECRET nas integrações para concluir a conexão automaticamente.",
      true
    ),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
  );
});