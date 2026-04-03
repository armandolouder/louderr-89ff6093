import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    const reason = url.searchParams.get("reason") || "Cancelamento via link no email";

    if (!email) {
      return new Response(renderPage("Erro", "Email não fornecido.", false), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const decodedEmail = decodeURIComponent(email).toLowerCase().trim();

    // Check if already unsubscribed
    const { data: existing } = await supabase
      .from("email_unsubscribes")
      .select("id")
      .eq("email", decodedEmail)
      .maybeSingle();

    if (existing) {
      return new Response(renderPage("Já removido", `O email <strong>${decodedEmail}</strong> já foi removido da nossa lista.`, true), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Insert unsubscribe record
    const { error } = await supabase.from("email_unsubscribes").insert({
      email: decodedEmail,
      reason,
    });

    if (error) {
      console.error("Unsubscribe error:", error);
      return new Response(renderPage("Erro", "Ocorreu um erro ao processar sua solicitação. Tente novamente.", false), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Also update imported_customers email_status if exists
    await supabase
      .from("imported_customers")
      .update({ email_status: "unsubscribed" })
      .eq("email", decodedEmail);

    return new Response(renderPage(
      "Inscrição cancelada",
      `O email <strong>${decodedEmail}</strong> foi removido com sucesso da nossa lista de emails. Você não receberá mais nossas comunicações.`,
      true
    ), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("Unsubscribe error:", error);
    return new Response(renderPage("Erro", "Erro interno. Tente novamente mais tarde.", false), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

function renderPage(title: string, message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — LOUDER.ink</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #111;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      color: #666;
      line-height: 1.6;
    }
    .brand {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #eee;
    }
    .brand p {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #111;
    }
    .brand small {
      font-size: 11px;
      color: #999;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✅" : "⚠️"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="brand">
      <p>LOUDER.ink</p>
      <small>Vista sua atitude</small>
    </div>
  </div>
</body>
</html>`;
}
