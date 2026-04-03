export const BRANDED_TEMPLATES = [
  {
    name: "Boas-vindas LOUDER",
    subject: "Bem-vindo à LOUDER.ink, {{nome}}! 🖤",
    category: "boas-vindas",
    preview_text: "Vista sua atitude. Conheça nossa coleção.",
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="https://acdn-us.mitiendanube.com/stores/002/778/031/themes/common/logo-507807513-1674425349-aa10b3e5b7752a1b2b57c619e6ba49b41674425349-640-0.webp" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
  </td></tr>
  <tr><td style="padding:48px 40px 20px;">
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#111;line-height:1.1;">Fala, {{nome}}! 🤘</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#666;line-height:1.6;">
      Seja bem-vindo(a) à <strong>LOUDER.ink</strong>. Aqui a gente acredita que roupa é extensão da atitude.
    </p>
    <p style="margin:0 0 32px;font-size:15px;color:#666;line-height:1.6;">
      Dá uma olhada nas nossas peças — cada uma conta uma história. E a próxima pode ser a sua.
    </p>
    <a href="https://louder.ink" style="display:inline-block;background:#000;color:#fff;padding:16px 48px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;">
      CONHECER A COLEÇÃO →
    </a>
  </td></tr>
  <tr><td style="padding:40px;text-align:center;">
    <p style="margin:0 0 8px;font-size:13px;color:#999;font-style:italic;">"Vista sua atitude."</p>
  </td></tr>
  <tr><td style="background:#000;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;letter-spacing:2px;color:#fff;opacity:0.9;">LOUDER.ink</p>
    <p style="margin:0 0 16px;font-size:11px;color:#fff;opacity:0.4;letter-spacing:1px;">Vista sua atitude</p>
    <p style="margin:0;font-size:11px;color:#fff;opacity:0.3;">
      <a href="{{unsubscribe_url}}" style="color:#fff;opacity:0.5;">Cancelar inscrição</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    name: "Promoção Relâmpago",
    subject: "⚡ {{nome}}, oferta exclusiva por tempo limitado!",
    category: "promocao",
    preview_text: "Aproveite antes que acabe. Peças selecionadas com desconto.",
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="https://acdn-us.mitiendanube.com/stores/002/778/031/themes/common/logo-507807513-1674425349-aa10b3e5b7752a1b2b57c619e6ba49b41674425349-640-0.webp" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
  </td></tr>
  <tr><td style="padding:48px 40px 20px;text-align:center;">
    <p style="margin:0 0 8px;font-size:48px;">⚡</p>
    <h1 style="margin:0 0 8px;font-size:32px;font-weight:800;color:#111;line-height:1.1;text-transform:uppercase;letter-spacing:2px;">Oferta Relâmpago</h1>
    <p style="margin:0 0 32px;font-size:16px;color:#666;line-height:1.6;">
      {{nome}}, separamos peças selecionadas com <strong style="color:#dc2626;">desconto exclusivo</strong> pra você.
      <br/>Mas corre — é por tempo limitado.
    </p>
    <a href="https://louder.ink" style="display:inline-block;background:#dc2626;color:#fff;padding:16px 48px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;">
      QUERO APROVEITAR →
    </a>
  </td></tr>
  <tr><td style="padding:24px 40px 40px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#999;">Válido enquanto durar o estoque. Não cumulativo.</p>
  </td></tr>
  <tr><td style="background:#000;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;letter-spacing:2px;color:#fff;opacity:0.9;">LOUDER.ink</p>
    <p style="margin:0;font-size:11px;color:#fff;opacity:0.3;">
      <a href="{{unsubscribe_url}}" style="color:#fff;opacity:0.5;">Cancelar inscrição</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    name: "Reativação — Sentimos sua falta",
    subject: "{{nome}}, faz tempo que você não aparece 💜",
    category: "reativacao",
    preview_text: "Tem coisa nova te esperando. Dá uma passada.",
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="https://acdn-us.mitiendanube.com/stores/002/778/031/themes/common/logo-507807513-1674425349-aa10b3e5b7752a1b2b57c619e6ba49b41674425349-640-0.webp" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
  </td></tr>
  <tr><td style="padding:48px 40px 20px;">
    <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#111;line-height:1.2;">Oi, {{nome}} 💜</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#666;line-height:1.6;">
      Faz um tempo que você não aparece por aqui. E tá tudo bem — a gente entende o corre.
    </p>
    <p style="margin:0 0 32px;font-size:15px;color:#666;line-height:1.6;">
      Mas queria te contar que tem <strong>peças novas</strong> que combinam com o seu estilo.
      Dá uma olhada quando puder — vai que rola?
    </p>
    <a href="https://louder.ink" style="display:inline-block;background:#000;color:#fff;padding:16px 48px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;">
      VER NOVIDADES →
    </a>
  </td></tr>
  <tr><td style="padding:24px 40px 40px;text-align:center;">
    <p style="margin:0;font-size:13px;color:#999;font-style:italic;">"A gente não esquece quem veste atitude."</p>
  </td></tr>
  <tr><td style="background:#000;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;letter-spacing:2px;color:#fff;opacity:0.9;">LOUDER.ink</p>
    <p style="margin:0;font-size:11px;color:#fff;opacity:0.3;">
      <a href="{{unsubscribe_url}}" style="color:#fff;opacity:0.5;">Cancelar inscrição</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    name: "Lançamento de Coleção",
    subject: "🔥 {{nome}}, a nova coleção chegou!",
    category: "lancamento",
    preview_text: "Peças novas, atitude renovada. Confira antes de todo mundo.",
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="https://acdn-us.mitiendanube.com/stores/002/778/031/themes/common/logo-507807513-1674425349-aa10b3e5b7752a1b2b57c619e6ba49b41674425349-640-0.webp" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
  </td></tr>
  <tr><td style="padding:48px 40px 20px;text-align:center;">
    <p style="margin:0 0 12px;font-size:14px;color:#999;text-transform:uppercase;letter-spacing:3px;">Nova coleção</p>
    <h1 style="margin:0 0 16px;font-size:36px;font-weight:800;color:#111;line-height:1.1;">DROP NOVO 🔥</h1>
    <p style="margin:0 0 32px;font-size:16px;color:#666;line-height:1.6;">
      {{nome}}, as peças que você esperava acabaram de chegar.
      <br/>Corre que as primeiras unidades voam.
    </p>
    <a href="https://louder.ink" style="display:inline-block;background:#000;color:#fff;padding:16px 48px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;">
      VER COLEÇÃO →
    </a>
  </td></tr>
  <tr><td style="padding:24px 40px 40px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#999;">Primeiros a comprar ganham frete grátis.</p>
  </td></tr>
  <tr><td style="background:#000;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;letter-spacing:2px;color:#fff;opacity:0.9;">LOUDER.ink</p>
    <p style="margin:0;font-size:11px;color:#fff;opacity:0.3;">
      <a href="{{unsubscribe_url}}" style="color:#fff;opacity:0.5;">Cancelar inscrição</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
];
