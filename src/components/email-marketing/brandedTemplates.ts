import { EmailBlock } from "./builder/types";

interface BrandedTemplate {
  name: string;
  subject: string;
  category: string;
  preview_text: string;
  html_content: string;
  blocks: EmailBlock[];
}

const LOGO_URL = "https://acdn-us.mitiendanube.com/stores/002/778/031/themes/common/logo-507807513-1674425349-aa10b3e5b7752a1b2b57c619e6ba49b41674425349-640-0.webp";

export const BRANDED_TEMPLATES: BrandedTemplate[] = [
  {
    name: "Boas-vindas LOUDER",
    subject: "Bem-vindo à LOUDER.ink, {{nome}}! 🖤",
    category: "boas-vindas",
    preview_text: "Vista sua atitude. Conheça nossa coleção.",
    blocks: [
      {
        id: "bv-header",
        type: "header",
        content: { title: "LOUDER.ink", subtitle: "", logoUrl: LOGO_URL },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "24px 40px", textAlign: "center", fontSize: "24px" },
      },
      {
        id: "bv-text1",
        type: "text",
        content: { text: "Fala, {{nome}}! 🤘\n\nSeja bem-vindo(a) à LOUDER.ink. Aqui a gente acredita que roupa é extensão da atitude.\n\nDá uma olhada nas nossas peças — cada uma conta uma história. E a próxima pode ser a sua." },
        styles: { backgroundColor: "#ffffff", textColor: "#333333", padding: "48px 40px 20px", fontSize: "16px", lineHeight: "1.6" },
      },
      {
        id: "bv-btn",
        type: "button",
        content: { text: "CONHECER A COLEÇÃO →", link: "https://louder.ink" },
        styles: { backgroundColor: "#ffffff", buttonColor: "#000000", buttonTextColor: "#ffffff", padding: "0 40px 32px", textAlign: "center", borderRadius: "4px", fontSize: "14px" },
      },
      {
        id: "bv-quote",
        type: "testimonial",
        content: { quote: '"Vista sua atitude."', author: "LOUDER.ink", role: "" },
        styles: { backgroundColor: "#ffffff", textColor: "#999999", padding: "24px 40px", fontSize: "13px", borderLeftColor: "#000000" },
      },
      {
        id: "bv-footer",
        type: "footer",
        content: { text: "LOUDER.ink • Vista sua atitude", unsubscribeText: "Cancelar inscrição" },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "32px 40px", fontSize: "11px", textAlign: "center" },
      },
    ],
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="${LOGO_URL}" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
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
    blocks: [
      {
        id: "pr-header",
        type: "header",
        content: { title: "LOUDER.ink", subtitle: "", logoUrl: LOGO_URL },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "24px 40px", textAlign: "center", fontSize: "24px" },
      },
      {
        id: "pr-text1",
        type: "text",
        content: { text: "⚡\n\nOFERTA RELÂMPAGO\n\n{{nome}}, separamos peças selecionadas com desconto exclusivo pra você.\nMas corre — é por tempo limitado." },
        styles: { backgroundColor: "#ffffff", textColor: "#333333", padding: "48px 40px 20px", fontSize: "16px", lineHeight: "1.6" },
      },
      {
        id: "pr-btn",
        type: "button",
        content: { text: "QUERO APROVEITAR →", link: "https://louder.ink" },
        styles: { backgroundColor: "#ffffff", buttonColor: "#dc2626", buttonTextColor: "#ffffff", padding: "0 40px 24px", textAlign: "center", borderRadius: "4px", fontSize: "14px" },
      },
      {
        id: "pr-disc",
        type: "text",
        content: { text: "Válido enquanto durar o estoque. Não cumulativo." },
        styles: { backgroundColor: "#ffffff", textColor: "#999999", padding: "0 40px 40px", fontSize: "12px", lineHeight: "1.4" },
      },
      {
        id: "pr-footer",
        type: "footer",
        content: { text: "LOUDER.ink", unsubscribeText: "Cancelar inscrição" },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "32px 40px", fontSize: "11px", textAlign: "center" },
      },
    ],
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="${LOGO_URL}" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
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
    blocks: [
      {
        id: "re-header",
        type: "header",
        content: { title: "LOUDER.ink", subtitle: "", logoUrl: LOGO_URL },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "24px 40px", textAlign: "center", fontSize: "24px" },
      },
      {
        id: "re-text1",
        type: "text",
        content: { text: "Oi, {{nome}} 💜\n\nFaz um tempo que você não aparece por aqui. E tá tudo bem — a gente entende o corre.\n\nMas queria te contar que tem peças novas que combinam com o seu estilo. Dá uma olhada quando puder — vai que rola?" },
        styles: { backgroundColor: "#ffffff", textColor: "#333333", padding: "48px 40px 20px", fontSize: "16px", lineHeight: "1.6" },
      },
      {
        id: "re-btn",
        type: "button",
        content: { text: "VER NOVIDADES →", link: "https://louder.ink" },
        styles: { backgroundColor: "#ffffff", buttonColor: "#000000", buttonTextColor: "#ffffff", padding: "0 40px 24px", textAlign: "center", borderRadius: "4px", fontSize: "14px" },
      },
      {
        id: "re-quote",
        type: "testimonial",
        content: { quote: '"A gente não esquece quem veste atitude."', author: "LOUDER.ink", role: "" },
        styles: { backgroundColor: "#ffffff", textColor: "#999999", padding: "24px 40px", fontSize: "13px", borderLeftColor: "#000000" },
      },
      {
        id: "re-footer",
        type: "footer",
        content: { text: "LOUDER.ink", unsubscribeText: "Cancelar inscrição" },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "32px 40px", fontSize: "11px", textAlign: "center" },
      },
    ],
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="${LOGO_URL}" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
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
    blocks: [
      {
        id: "lc-header",
        type: "header",
        content: { title: "LOUDER.ink", subtitle: "", logoUrl: LOGO_URL },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "24px 40px", textAlign: "center", fontSize: "24px" },
      },
      {
        id: "lc-text1",
        type: "text",
        content: { text: "Nova coleção\n\nDROP NOVO 🔥\n\n{{nome}}, as peças que você esperava acabaram de chegar.\nCorre que as primeiras unidades voam." },
        styles: { backgroundColor: "#ffffff", textColor: "#333333", padding: "48px 40px 20px", fontSize: "16px", lineHeight: "1.6" },
      },
      {
        id: "lc-btn",
        type: "button",
        content: { text: "VER COLEÇÃO →", link: "https://louder.ink" },
        styles: { backgroundColor: "#ffffff", buttonColor: "#000000", buttonTextColor: "#ffffff", padding: "0 40px 24px", textAlign: "center", borderRadius: "4px", fontSize: "14px" },
      },
      {
        id: "lc-disc",
        type: "text",
        content: { text: "Primeiros a comprar ganham frete grátis." },
        styles: { backgroundColor: "#ffffff", textColor: "#999999", padding: "0 40px 40px", fontSize: "12px", lineHeight: "1.4" },
      },
      {
        id: "lc-footer",
        type: "footer",
        content: { text: "LOUDER.ink", unsubscribeText: "Cancelar inscrição" },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "32px 40px", fontSize: "11px", textAlign: "center" },
      },
    ],
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="${LOGO_URL}" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
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
  // ===== RECOVERY ENGINE TEMPLATES =====
  {
    name: "Recuperação — Emocional 💜",
    subject: "{{nome}}, você deixou isso aqui 💜",
    category: "recuperacao",
    preview_text: "Esses itens não ficaram aí por acaso.",
    blocks: [
      {
        id: "rec-em-header",
        type: "header",
        content: { title: "LOUDER.ink", subtitle: "", logoUrl: LOGO_URL },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "24px 40px", textAlign: "center", fontSize: "24px" },
      },
      {
        id: "rec-em-text1",
        type: "text",
        content: { text: "Você deixou isso aqui.\n\nOi {{nome}}, esses itens não ficaram aí por acaso." },
        styles: { backgroundColor: "#ffffff", textColor: "#333333", padding: "40px 40px 20px", fontSize: "16px", lineHeight: "1.6" },
      },
      {
        id: "rec-em-text2",
        type: "text",
        content: { text: "🛒 Seus itens estão esperando por você.\n\nTotal: R$ XX,XX" },
        styles: { backgroundColor: "#ffffff", textColor: "#111111", padding: "0 40px 20px", fontSize: "15px", lineHeight: "1.6" },
      },
      {
        id: "rec-em-btn",
        type: "button",
        content: { text: "FINALIZAR COMPRA →", link: "{{recovery_url}}" },
        styles: { backgroundColor: "#ffffff", buttonColor: "#000000", buttonTextColor: "#ffffff", padding: "0 40px 24px", textAlign: "center", borderRadius: "4px", fontSize: "14px" },
      },
      {
        id: "rec-em-quote",
        type: "testimonial",
        content: { quote: '"Isso não ficou aí por acaso."', author: "LOUDER.ink", role: "" },
        styles: { backgroundColor: "#ffffff", textColor: "#999999", padding: "24px 40px", fontSize: "13px", borderLeftColor: "#000000" },
      },
      {
        id: "rec-em-footer",
        type: "footer",
        content: { text: "LOUDER.ink • Vista sua atitude", unsubscribeText: "Cancelar inscrição" },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "32px 40px", fontSize: "11px", textAlign: "center" },
      },
    ],
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="${LOGO_URL}" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
  </td></tr>
  <tr><td style="padding:40px 40px 20px;">
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111;line-height:1.2;">Você deixou isso aqui.</h2>
    <p style="margin:0 0 32px;font-size:15px;color:#666;line-height:1.5;">Oi {{nome}}, esses itens não ficaram aí por acaso.</p>
  </td></tr>
  <tr><td style="padding:0 40px 20px;">
    <p style="margin:0;font-size:15px;color:#111;">🛒 Seus itens estão esperando por você.</p>
    <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#111;">Total: R$ XX,XX</p>
  </td></tr>
  <tr><td style="padding:32px 40px;text-align:center;">
    <a href="{{recovery_url}}" style="display:inline-block;background:#000;color:#fff;padding:16px 48px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;">FINALIZAR COMPRA →</a>
  </td></tr>
  <tr><td style="padding:0 40px 40px;text-align:center;">
    <p style="margin:0;font-size:13px;color:#999;font-style:italic;">"Isso não ficou aí por acaso."</p>
  </td></tr>
  <tr><td style="background:#000;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;letter-spacing:2px;color:#fff;opacity:0.9;">LOUDER.ink</p>
    <p style="margin:0 0 16px;font-size:11px;color:#fff;opacity:0.4;letter-spacing:1px;">Vista sua atitude</p>
    <p style="margin:0;font-size:11px;color:#fff;opacity:0.3;"><a href="{{unsubscribe_url}}" style="color:#fff;opacity:0.5;">Cancelar inscrição</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    name: "Recuperação — Urgência ⚡",
    subject: "⚡ {{nome}}, seus itens podem esgotar!",
    category: "recuperacao",
    preview_text: "O estoque tá acabando e a gente não quer que você perca.",
    blocks: [
      {
        id: "rec-ur-header",
        type: "header",
        content: { title: "LOUDER.ink", subtitle: "", logoUrl: LOGO_URL },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "24px 40px", textAlign: "center", fontSize: "24px" },
      },
      {
        id: "rec-ur-text1",
        type: "text",
        content: { text: "Corre, esses itens são limitados.\n\nOi {{nome}}, o estoque tá acabando e a gente não quer que você perca." },
        styles: { backgroundColor: "#ffffff", textColor: "#333333", padding: "40px 40px 20px", fontSize: "16px", lineHeight: "1.6" },
      },
      {
        id: "rec-ur-text2",
        type: "text",
        content: { text: "🛒 Seus itens estão esperando por você.\n\nTotal: R$ XX,XX" },
        styles: { backgroundColor: "#ffffff", textColor: "#111111", padding: "0 40px 20px", fontSize: "15px", lineHeight: "1.6" },
      },
      {
        id: "rec-ur-btn",
        type: "button",
        content: { text: "GARANTIR AGORA →", link: "{{recovery_url}}" },
        styles: { backgroundColor: "#ffffff", buttonColor: "#dc2626", buttonTextColor: "#ffffff", padding: "0 40px 24px", textAlign: "center", borderRadius: "4px", fontSize: "14px" },
      },
      {
        id: "rec-ur-footer",
        type: "footer",
        content: { text: "LOUDER.ink • Vista sua atitude", unsubscribeText: "Cancelar inscrição" },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "32px 40px", fontSize: "11px", textAlign: "center" },
      },
    ],
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="${LOGO_URL}" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
  </td></tr>
  <tr><td style="padding:40px 40px 20px;">
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111;line-height:1.2;">Corre, esses itens são limitados.</h2>
    <p style="margin:0 0 32px;font-size:15px;color:#666;line-height:1.5;">Oi {{nome}}, o estoque tá acabando e a gente não quer que você perca.</p>
  </td></tr>
  <tr><td style="padding:0 40px 20px;">
    <p style="margin:0;font-size:15px;color:#111;">🛒 Seus itens estão esperando por você.</p>
    <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#111;">Total: R$ XX,XX</p>
  </td></tr>
  <tr><td style="padding:32px 40px;text-align:center;">
    <a href="{{recovery_url}}" style="display:inline-block;background:#dc2626;color:#fff;padding:16px 48px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;">GARANTIR AGORA →</a>
  </td></tr>
  <tr><td style="background:#000;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;letter-spacing:2px;color:#fff;opacity:0.9;">LOUDER.ink</p>
    <p style="margin:0 0 16px;font-size:11px;color:#fff;opacity:0.4;letter-spacing:1px;">Vista sua atitude</p>
    <p style="margin:0;font-size:11px;color:#fff;opacity:0.3;"><a href="{{unsubscribe_url}}" style="color:#fff;opacity:0.5;">Cancelar inscrição</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    name: "Recuperação — Incentivo 🎁",
    subject: "🎁 {{nome}}, temos algo especial pra você",
    category: "recuperacao",
    preview_text: "Finalize sua compra e desbloqueie algo exclusivo.",
    blocks: [
      {
        id: "rec-in-header",
        type: "header",
        content: { title: "LOUDER.ink", subtitle: "", logoUrl: LOGO_URL },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "24px 40px", textAlign: "center", fontSize: "24px" },
      },
      {
        id: "rec-in-text1",
        type: "text",
        content: { text: "Esse carrinho libera algo exclusivo.\n\nOi {{nome}}, finalize sua compra e desbloqueie um conteúdo especial da LOUDER." },
        styles: { backgroundColor: "#ffffff", textColor: "#333333", padding: "40px 40px 20px", fontSize: "16px", lineHeight: "1.6" },
      },
      {
        id: "rec-in-text2",
        type: "text",
        content: { text: "🛒 Seus itens estão esperando por você.\n\nTotal: R$ XX,XX" },
        styles: { backgroundColor: "#ffffff", textColor: "#111111", padding: "0 40px 20px", fontSize: "15px", lineHeight: "1.6" },
      },
      {
        id: "rec-in-btn",
        type: "button",
        content: { text: "QUERO MEU BÔNUS →", link: "{{recovery_url}}" },
        styles: { backgroundColor: "#ffffff", buttonColor: "#000000", buttonTextColor: "#ffffff", padding: "0 40px 24px", textAlign: "center", borderRadius: "4px", fontSize: "14px" },
      },
      {
        id: "rec-in-quote",
        type: "testimonial",
        content: { quote: '"Esse carrinho libera algo exclusivo depois da compra."', author: "LOUDER.ink", role: "" },
        styles: { backgroundColor: "#ffffff", textColor: "#999999", padding: "24px 40px", fontSize: "13px", borderLeftColor: "#000000" },
      },
      {
        id: "rec-in-footer",
        type: "footer",
        content: { text: "LOUDER.ink • Vista sua atitude", unsubscribeText: "Cancelar inscrição" },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "32px 40px", fontSize: "11px", textAlign: "center" },
      },
    ],
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="${LOGO_URL}" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
  </td></tr>
  <tr><td style="padding:40px 40px 20px;">
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111;line-height:1.2;">Esse carrinho libera algo exclusivo.</h2>
    <p style="margin:0 0 32px;font-size:15px;color:#666;line-height:1.5;">Oi {{nome}}, finalize sua compra e desbloqueie um conteúdo especial da LOUDER.</p>
  </td></tr>
  <tr><td style="padding:0 40px 20px;">
    <p style="margin:0;font-size:15px;color:#111;">🛒 Seus itens estão esperando por você.</p>
    <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#111;">Total: R$ XX,XX</p>
  </td></tr>
  <tr><td style="padding:32px 40px;text-align:center;">
    <a href="{{recovery_url}}" style="display:inline-block;background:#000;color:#fff;padding:16px 48px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;">QUERO MEU BÔNUS →</a>
  </td></tr>
  <tr><td style="padding:0 40px 40px;text-align:center;">
    <p style="margin:0;font-size:13px;color:#999;font-style:italic;">"Esse carrinho libera algo exclusivo depois da compra."</p>
  </td></tr>
  <tr><td style="background:#000;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;letter-spacing:2px;color:#fff;opacity:0.9;">LOUDER.ink</p>
    <p style="margin:0 0 16px;font-size:11px;color:#fff;opacity:0.4;letter-spacing:1px;">Vista sua atitude</p>
    <p style="margin:0;font-size:11px;color:#fff;opacity:0.3;"><a href="{{unsubscribe_url}}" style="color:#fff;opacity:0.5;">Cancelar inscrição</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    name: "Recuperação — Última Chamada ⏰",
    subject: "⏰ Última chance, {{nome}}!",
    category: "recuperacao",
    preview_text: "Seu carrinho será limpo em breve. Essa é a última vez.",
    blocks: [
      {
        id: "rec-uc-header",
        type: "header",
        content: { title: "LOUDER.ink", subtitle: "", logoUrl: LOGO_URL },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "24px 40px", textAlign: "center", fontSize: "24px" },
      },
      {
        id: "rec-uc-text1",
        type: "text",
        content: { text: "Última chamada.\n\nOi {{nome}}, seu carrinho será limpo em breve. Essa é a última vez que vamos te lembrar." },
        styles: { backgroundColor: "#ffffff", textColor: "#333333", padding: "40px 40px 20px", fontSize: "16px", lineHeight: "1.6" },
      },
      {
        id: "rec-uc-text2",
        type: "text",
        content: { text: "🛒 Seus itens estão esperando por você.\n\nTotal: R$ XX,XX" },
        styles: { backgroundColor: "#ffffff", textColor: "#111111", padding: "0 40px 20px", fontSize: "15px", lineHeight: "1.6" },
      },
      {
        id: "rec-uc-btn",
        type: "button",
        content: { text: "FINALIZAR COMPRA →", link: "{{recovery_url}}" },
        styles: { backgroundColor: "#ffffff", buttonColor: "#f59e0b", buttonTextColor: "#000000", padding: "0 40px 24px", textAlign: "center", borderRadius: "4px", fontSize: "14px" },
      },
      {
        id: "rec-uc-footer",
        type: "footer",
        content: { text: "LOUDER.ink • Vista sua atitude", unsubscribeText: "Cancelar inscrição" },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "32px 40px", fontSize: "11px", textAlign: "center" },
      },
    ],
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="${LOGO_URL}" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
  </td></tr>
  <tr><td style="padding:40px 40px 20px;">
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111;line-height:1.2;">Última chamada.</h2>
    <p style="margin:0 0 32px;font-size:15px;color:#666;line-height:1.5;">Oi {{nome}}, seu carrinho será limpo em breve. Essa é a última vez que vamos te lembrar.</p>
  </td></tr>
  <tr><td style="padding:0 40px 20px;">
    <p style="margin:0;font-size:15px;color:#111;">🛒 Seus itens estão esperando por você.</p>
    <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#111;">Total: R$ XX,XX</p>
  </td></tr>
  <tr><td style="padding:32px 40px;text-align:center;">
    <a href="{{recovery_url}}" style="display:inline-block;background:#f59e0b;color:#000;padding:16px 48px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;">FINALIZAR COMPRA →</a>
  </td></tr>
  <tr><td style="background:#000;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;letter-spacing:2px;color:#fff;opacity:0.9;">LOUDER.ink</p>
    <p style="margin:0 0 16px;font-size:11px;color:#fff;opacity:0.4;letter-spacing:1px;">Vista sua atitude</p>
    <p style="margin:0;font-size:11px;color:#fff;opacity:0.3;"><a href="{{unsubscribe_url}}" style="color:#fff;opacity:0.5;">Cancelar inscrição</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    name: "Recuperação — Leve 👋",
    subject: "{{nome}}, separamos seu carrinho 👋",
    category: "recuperacao",
    preview_text: "É só finalizar a compra. Rápido e fácil.",
    blocks: [
      {
        id: "rec-lv-header",
        type: "header",
        content: { title: "LOUDER.ink", subtitle: "", logoUrl: LOGO_URL },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "24px 40px", textAlign: "center", fontSize: "24px" },
      },
      {
        id: "rec-lv-text1",
        type: "text",
        content: { text: "Separamos tudo pra você.\n\nOi {{nome}}, é só finalizar a compra. Rápido e fácil." },
        styles: { backgroundColor: "#ffffff", textColor: "#333333", padding: "40px 40px 20px", fontSize: "16px", lineHeight: "1.6" },
      },
      {
        id: "rec-lv-text2",
        type: "text",
        content: { text: "🛒 Seus itens estão esperando por você.\n\nTotal: R$ XX,XX" },
        styles: { backgroundColor: "#ffffff", textColor: "#111111", padding: "0 40px 20px", fontSize: "15px", lineHeight: "1.6" },
      },
      {
        id: "rec-lv-btn",
        type: "button",
        content: { text: "FINALIZAR COMPRA →", link: "{{recovery_url}}" },
        styles: { backgroundColor: "#ffffff", buttonColor: "#000000", buttonTextColor: "#ffffff", padding: "0 40px 24px", textAlign: "center", borderRadius: "4px", fontSize: "14px" },
      },
      {
        id: "rec-lv-footer",
        type: "footer",
        content: { text: "LOUDER.ink • Vista sua atitude", unsubscribeText: "Cancelar inscrição" },
        styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "32px 40px", fontSize: "11px", textAlign: "center" },
      },
    ],
    html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
<tr><td align="center" style="padding:0;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#000;padding:24px 40px;text-align:center;">
    <img src="${LOGO_URL}" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;" />
  </td></tr>
  <tr><td style="padding:40px 40px 20px;">
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111;line-height:1.2;">Separamos tudo pra você.</h2>
    <p style="margin:0 0 32px;font-size:15px;color:#666;line-height:1.5;">Oi {{nome}}, é só finalizar a compra. Rápido e fácil.</p>
  </td></tr>
  <tr><td style="padding:0 40px 20px;">
    <p style="margin:0;font-size:15px;color:#111;">🛒 Seus itens estão esperando por você.</p>
    <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#111;">Total: R$ XX,XX</p>
  </td></tr>
  <tr><td style="padding:32px 40px;text-align:center;">
    <a href="{{recovery_url}}" style="display:inline-block;background:#000;color:#fff;padding:16px 48px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;">FINALIZAR COMPRA →</a>
  </td></tr>
  <tr><td style="background:#000;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;letter-spacing:2px;color:#fff;opacity:0.9;">LOUDER.ink</p>
    <p style="margin:0 0 16px;font-size:11px;color:#fff;opacity:0.4;letter-spacing:1px;">Vista sua atitude</p>
    <p style="margin:0;font-size:11px;color:#fff;opacity:0.3;"><a href="{{unsubscribe_url}}" style="color:#fff;opacity:0.5;">Cancelar inscrição</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
];
