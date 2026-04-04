import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function buildProductGrid(products: any[]) {
  if (!products?.length) return "";
  return products
    .map(
      (p: any) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              ${
                p.image
                  ? `<td width="80" style="vertical-align: top; padding-right: 16px;">
                      <img src="${p.image}" alt="${p.name || "Produto"}" width="80" height="80" style="display: block; border-radius: 8px; object-fit: cover; background: #f5f5f5;" />
                    </td>`
                  : `<td width="80" style="vertical-align: top; padding-right: 16px;">
                      <div style="width: 80px; height: 80px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">🛒</span>
                      </div>
                    </td>`
              }
              <td style="vertical-align: middle;">
                <p style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #111;">${p.name || "Produto"}</p>
                ${p.variant ? `<p style="margin: 0 0 4px; font-size: 12px; color: #888;">${p.variant}</p>` : ""}
                <p style="margin: 0; font-size: 14px; color: #111;">
                  ${p.quantity && p.quantity > 1 ? `${p.quantity}x ` : ""}R$ ${Number(p.price || 0).toFixed(2).replace(".", ",")}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");
}

function buildRecoveryEmail(
  stepType: string,
  firstName: string,
  products: any[],
  total: number,
  recoveryUrl: string | null
) {
  const totalFormatted = `R$ ${Number(total || 0).toFixed(2).replace(".", ",")}`;
  const productGrid = buildProductGrid(products);

  const headlines: Record<string, { subject: string; title: string; subtitle: string; ctaText: string; ctaColor: string; emote: string }> = {
    emocional: {
      subject: `${firstName}, você deixou isso aqui 💜`,
      title: "Você deixou isso aqui.",
      subtitle: "Esses itens não ficaram aí por acaso.",
      ctaText: "FINALIZAR COMPRA",
      ctaColor: "#000000",
      emote: "💜",
    },
    urgencia: {
      subject: `⚡ ${firstName}, seus itens podem esgotar!`,
      title: "Corre, esses itens são limitados.",
      subtitle: "O estoque tá acabando e a gente não quer que você perca.",
      ctaText: "GARANTIR AGORA",
      ctaColor: "#dc2626",
      emote: "⚡",
    },
    incentivo: {
      subject: `🎁 ${firstName}, temos algo especial pra você`,
      title: "Esse carrinho libera algo exclusivo.",
      subtitle: "Finalize sua compra e desbloqueie um conteúdo especial da LOUDER.",
      ctaText: "QUERO MEU BÔNUS",
      ctaColor: "#000000",
      emote: "🎁",
    },
    ultima_chamada: {
      subject: `⏰ Última chance, ${firstName}!`,
      title: "Última chamada.",
      subtitle: "Seu carrinho será limpo em breve. Essa é a última vez que vamos te lembrar.",
      ctaText: "FINALIZAR COMPRA",
      ctaColor: "#f59e0b",
      emote: "⏰",
    },
    leve: {
      subject: `${firstName}, separamos seu carrinho 👋`,
      title: "Separamos tudo pra você.",
      subtitle: "É só finalizar a compra. Rápido e fácil.",
      ctaText: "FINALIZAR COMPRA",
      ctaColor: "#000000",
      emote: "👋",
    },
  };

  const h = headlines[stepType] || headlines.emocional;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background: #ffffff;">
          
          <!-- HEADER: Black with logo -->
          <tr>
            <td style="background: #000000; padding: 24px 40px; text-align: center;">
              <img src="https://acdn-us.mitiendanube.com/stores/002/778/031/themes/common/logo-507807513-1674425349-aa10b3e5b7752a1b2b57c619e6ba49b41674425349-640-0.webp" alt="LOUDER.ink" style="display: inline-block; max-width: 280px; width: 100%; height: auto;" />
            </td>
          </tr>
          
          <!-- BODY -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #111111; line-height: 1.2;">
                ${h.title}
              </h2>
              <p style="margin: 0 0 32px; font-size: 15px; color: #666666; line-height: 1.5;">
                ${firstName ? `Oi ${firstName}, ` : ""}${h.subtitle.charAt(0).toLowerCase() + h.subtitle.slice(1)}
              </p>
            </td>
          </tr>
          
          <!-- PRODUCTS GRID -->
          <tr>
            <td style="padding: 0 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${productGrid}
              </table>
            </td>
          </tr>
          
          <!-- TOTAL -->
          <tr>
            <td style="padding: 20px 40px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 2px solid #111;">
                <tr>
                  <td style="padding: 16px 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Total</td>
                        <td style="text-align: right; font-size: 22px; font-weight: 700; color: #111;">${totalFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA BUTTON -->
          ${
            recoveryUrl
              ? `<tr>
                  <td style="padding: 32px 40px; text-align: center;">
                    <a href="${recoveryUrl}" style="display: inline-block; background: ${h.ctaColor}; color: ${h.ctaColor === "#f59e0b" ? "#000" : "#fff"}; padding: 16px 48px; border-radius: 4px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 1.5px; text-transform: uppercase;">
                      ${h.ctaText} →
                    </a>
                  </td>
                </tr>`
              : ""
          }
          
          <!-- EMOTIONAL HOOK -->
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #999; font-style: italic;">
                ${stepType === "incentivo" ? "Esse carrinho libera algo exclusivo depois da compra." : "Isso não ficou aí por acaso."}
              </p>
            </td>
          </tr>
          
          <!-- FOOTER: Black -->
          <tr>
            <td style="background: #000000; padding: 32px 40px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 16px; font-weight: 700; letter-spacing: 2px; color: #ffffff; opacity: 0.9;">
                LOUDER.ink
              </p>
              <p style="margin: 0 0 16px; font-size: 11px; color: #ffffff; opacity: 0.4; letter-spacing: 1px;">
                Vista sua atitude
              </p>
              <p style="margin: 0; font-size: 11px; color: #ffffff; opacity: 0.3;">
                © ${new Date().getFullYear()} LOUDER.ink — Todos os direitos reservados
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: h.subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "BREVO_API_KEY não configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    // Test connection
    if (action === "test-connection") {
      const res = await fetch("https://api.brevo.com/v3/senders", {
        headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ success: false, error: `Brevo API error [${res.status}]: ${errText}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      const sender = data.senders?.[0];

      return new Response(
        JSON.stringify({
          success: true,
          senderName: sender?.name || "N/A",
          senderEmail: sender?.email || "N/A",
          totalSenders: data.senders?.length || 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email
    if (action === "send") {
      const { to, subject, htmlContent, textContent, senderName, senderEmail, tags, params } = body;

      if (!to || !subject) {
        return new Response(
          JSON.stringify({ success: false, error: "Campos 'to' e 'subject' são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let fromName = senderName || "LOUDER.ink";
      let fromEmail = senderEmail;

      if (!fromEmail) {
        const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
          headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
        });
        if (sendersRes.ok) {
          const sendersData = await sendersRes.json();
          fromEmail = sendersData.senders?.[0]?.email;
        }
      }

      if (!fromEmail) {
        return new Response(
          JSON.stringify({ success: false, error: "Nenhum remetente configurado na Brevo" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailPayload: any = {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: htmlContent || undefined,
        textContent: textContent || undefined,
        tags: tags || ["recovery-engine"],
      };

      if (params) emailPayload.params = params;

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Brevo send error [${res.status}]:`, errText);
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao enviar: ${errText}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await res.json();
      return new Response(
        JSON.stringify({ success: true, messageId: result.messageId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send recovery email with branded template
    if (action === "send-recovery") {
      const { to, customerName, products, total, recoveryUrl, variant, stepType } = body;

      if (!to) {
        return new Response(
          JSON.stringify({ success: false, error: "Campo 'to' é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get default sender
      const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
        headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
      });
      let fromEmail = "";
      if (sendersRes.ok) {
        const sendersData = await sendersRes.json();
        fromEmail = sendersData.senders?.[0]?.email || "";
      }

      if (!fromEmail) {
        return new Response(
          JSON.stringify({ success: false, error: "Nenhum remetente configurado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const firstName = (customerName || "").split(" ")[0] || "Cliente";
      const emailContent = buildRecoveryEmail(
        stepType || "emocional",
        firstName,
        products || [],
        total || 0,
        recoveryUrl
      );

      const emailPayload = {
        sender: { name: "LOUDER.ink", email: fromEmail },
        to: [{ email: to }],
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        tags: ["recovery-engine", stepType || "emocional", variant || "A"],
      };

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ success: false, error: errText }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await res.json();
      return new Response(
        JSON.stringify({ success: true, messageId: result.messageId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preview email template (for dashboard)
    if (action === "preview-template") {
      const { stepType, customerName, products, total, recoveryUrl } = body;
      const firstName = (customerName || "").split(" ")[0] || "Cliente";
      const emailContent = buildRecoveryEmail(
        stepType || "emocional",
        firstName,
        products || [],
        total || 0,
        recoveryUrl || "https://louder.ink/checkout/exemplo"
      );

      return new Response(
        JSON.stringify({ success: true, subject: emailContent.subject, html: emailContent.html }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Brevo error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
