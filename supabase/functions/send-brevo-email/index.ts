import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "BREVO_API_KEY não configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    // Test connection - get account info
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

      // Get default sender
      let fromName = senderName || "Armando";
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

      if (params) {
        emailPayload.params = params;
      }

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
      console.log("Brevo email sent:", result);

      return new Response(
        JSON.stringify({ success: true, messageId: result.messageId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send recovery email with template
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
      const productsList = (products || [])
        .map((p: any) => `<li>${p.quantity || 1}x ${p.name} - R$ ${Number(p.price || 0).toFixed(2).replace(".", ",")}</li>`)
        .join("");
      const totalFormatted = `R$ ${Number(total || 0).toFixed(2).replace(".", ",")}`;

      // Different email templates based on step type
      const templates: Record<string, { subject: string; html: string }> = {
        emocional: {
          subject: `${firstName}, seus itens estão esperando por você 💜`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000; color: #fff;">
              <h1 style="font-size: 24px; margin-bottom: 16px;">Ei ${firstName},</h1>
              <p style="color: #ccc; line-height: 1.6;">Notamos que você deixou alguns itens incríveis no seu carrinho. Eles ainda estão lá, esperando por você.</p>
              <div style="background: #111; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <ul style="list-style: none; padding: 0; color: #ddd;">${productsList}</ul>
                <p style="font-size: 18px; font-weight: bold; color: #fff; margin-top: 12px;">Total: ${totalFormatted}</p>
              </div>
              ${recoveryUrl ? `<a href="${recoveryUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 12px;">Finalizar Compra →</a>` : ""}
              <p style="color: #666; font-size: 12px; margin-top: 24px;">LOUDER.ink — Vista sua atitude</p>
            </div>
          `,
        },
        urgencia: {
          subject: `⚡ ${firstName}, seus itens podem esgotar!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000; color: #fff;">
              <h1 style="font-size: 24px; margin-bottom: 16px;">Corre, ${firstName}!</h1>
              <p style="color: #ccc; line-height: 1.6;">Os itens do seu carrinho são limitados e podem não estar disponíveis por muito tempo.</p>
              <div style="background: #111; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <ul style="list-style: none; padding: 0; color: #ddd;">${productsList}</ul>
                <p style="font-size: 18px; font-weight: bold; color: #fff; margin-top: 12px;">Total: ${totalFormatted}</p>
              </div>
              ${recoveryUrl ? `<a href="${recoveryUrl}" style="display: inline-block; background: #dc2626; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 12px;">Garantir Agora →</a>` : ""}
              <p style="color: #666; font-size: 12px; margin-top: 24px;">LOUDER.ink — Vista sua atitude</p>
            </div>
          `,
        },
        incentivo: {
          subject: `🎁 ${firstName}, temos algo especial pra você`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000; color: #fff;">
              <h1 style="font-size: 24px; margin-bottom: 16px;">${firstName}, você merece isso!</h1>
              <p style="color: #ccc; line-height: 1.6;">Finalize sua compra agora e receba um conteúdo exclusivo da LOUDER.</p>
              <div style="background: #111; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <ul style="list-style: none; padding: 0; color: #ddd;">${productsList}</ul>
                <p style="font-size: 18px; font-weight: bold; color: #fff; margin-top: 12px;">Total: ${totalFormatted}</p>
              </div>
              ${recoveryUrl ? `<a href="${recoveryUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 12px;">Quero Meu Bônus →</a>` : ""}
              <p style="color: #666; font-size: 12px; margin-top: 24px;">LOUDER.ink — Vista sua atitude</p>
            </div>
          `,
        },
        ultima_chamada: {
          subject: `⏰ Última chance, ${firstName}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000; color: #fff;">
              <h1 style="font-size: 24px; margin-bottom: 16px;">Última chamada, ${firstName}.</h1>
              <p style="color: #ccc; line-height: 1.6;">Seu carrinho será limpo em breve. Essa é a última vez que vamos te lembrar.</p>
              <div style="background: #111; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <ul style="list-style: none; padding: 0; color: #ddd;">${productsList}</ul>
                <p style="font-size: 18px; font-weight: bold; color: #fff; margin-top: 12px;">Total: ${totalFormatted}</p>
              </div>
              ${recoveryUrl ? `<a href="${recoveryUrl}" style="display: inline-block; background: #f59e0b; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 12px;">Finalizar Compra →</a>` : ""}
              <p style="color: #666; font-size: 12px; margin-top: 24px;">LOUDER.ink — Vista sua atitude</p>
            </div>
          `,
        },
      };

      const template = templates[stepType || "emocional"] || templates.emocional;

      const emailPayload = {
        sender: { name: "Armando", email: fromEmail },
        to: [{ email: to }],
        subject: template.subject,
        htmlContent: template.html,
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
