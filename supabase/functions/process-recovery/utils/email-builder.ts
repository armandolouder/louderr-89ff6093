 import { JourneyProduct } from "../../_shared/variables.ts";
 
 export interface EmailHeadline {
   subject: string;
   title: string;
   subtitle: string;
   ctaText: string;
   ctaColor: string;
 }
 
 export const headlines: Record<string, EmailHeadline> = {
   emocional: { subject: "[nome_cliente], você deixou isso aqui 💜", title: "Você deixou isso aqui.", subtitle: "Esses itens não ficaram aí por acaso.", ctaText: "FINALIZAR COMPRA", ctaColor: "#000000" },
   urgencia: { subject: "⚡ [nome_cliente], seus itens podem esgotar!", title: "Corre, esses itens são limitados.", subtitle: "O estoque tá acabando e a gente não quer que você perca.", ctaText: "GARANTIR AGORA", ctaColor: "#dc2626" },
   incentivo: { subject: "🎁 [nome_cliente], temos algo especial pra você", title: "Esse carrinho libera algo exclusivo.", subtitle: "Finalize sua compra e desbloqueie um conteúdo especial da LOUDER.", ctaText: "QUERO MEU BÔNUS", ctaColor: "#000000" },
   ultima_chamada: { subject: "⏰ Última chance, [nome_cliente]!", title: "Última chamada.", subtitle: "Seu carrinho será limpo em breve. Essa é a última vez que vamos te lembrar.", ctaText: "FINALIZAR COMPRA", ctaColor: "#f59e0b" },
   leve: { subject: "[nome_cliente], separamos seu carrinho 👋", title: "Separamos tudo pra você.", subtitle: "É só finalizar a compra. Rápido e fácil.", ctaText: "FINALIZAR COMPRA", ctaColor: "#000000" },
 };

/** Monta a grade de produtos (2 colunas) para injetar em {{produtos}}. */
export function buildProductGridHtml(products: JourneyProduct[]): string {
  const cols = 2;
  let rows = "";
  const list = products || [];
  for (let i = 0; i < list.length; i += cols) {
    const cells = list.slice(i, i + cols).map((p) => {
      const priceFormatted = `R$ ${Number(p.price || 0).toFixed(2).replace(".", ",")}`;
      const qtyLabel = p.quantity && p.quantity > 1 ? `${p.quantity}x ` : "";
      return `<td width="50%" style="padding:4px;vertical-align:top;">
        <div style="background:#f5f5f5;overflow:hidden;">
          ${p.image ? `<img src="${p.image}" alt="${p.name || "Produto"}" width="100%" style="display:block;width:100%;object-fit:cover;" />` : `<div style="width:100%;height:160px;background:#f5f5f5;text-align:center;line-height:160px;font-size:28px;">🛒</div>`}
        </div>
        <div style="padding:8px 4px;">
          <p style="margin:0 0 4px;font-weight:700;font-size:12px;color:#111;text-transform:uppercase;line-height:1.3;">${p.name || "Produto"}</p>
          ${p.variant ? `<p style="margin:0 0 4px;font-size:11px;color:#888;">${p.variant}</p>` : ""}
          <p style="margin:0;font-size:13px;font-weight:700;color:#000;">${qtyLabel}${priceFormatted}</p>
        </div>
      </td>`;
    }).join("");
    rows += `<tr>${cells}</tr>`;
  }
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>`;
}

/** Aplica os dados reais do carrinho a um template HTML personalizado salvo no builder. */
export function applyRecoveryTemplate(
  html: string,
  firstName: string,
  products: JourneyProduct[],
  total: number,
  recoveryUrl: string | null
): string {
  const totalFormatted = `R$ ${Number(total || 0).toFixed(2).replace(".", ",")}`;
  return html
    .replace(/\{\{nome\}\}/gi, firstName || "Cliente")
    .replace(/\{\{total\}\}/gi, totalFormatted)
    .replace(/\{\{produtos\}\}/gi, buildProductGridHtml(products))
    .replace(/\{\{recovery_url\}\}/gi, recoveryUrl || "#")
    .replace(/\{\{unsubscribe_url\}\}/gi, "#");
}
 
  export function buildRecoveryEmailHtml(
   stepType: string,
   firstName: string,
   products: JourneyProduct[],
   total: number,
   recoveryUrl: string | null
 ) {
   const totalFormatted = `R$ ${Number(total || 0).toFixed(2).replace(".", ",")}`;
 
    const productGrid = buildProductGridHtml(products || []);
 
   const h = headlines[stepType] || headlines.emocional;
   
   // Substitui placeholder no subject
   const subject = h.subject.replace("[nome_cliente]", firstName || "Cliente");
 
   const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
 <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
 <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;"><tr><td align="center">
 <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#fff;">
   <tr><td style="background:#000;padding:24px 40px;text-align:center;">
     <img src="https://acdn-us.mitiendanube.com/stores/002/778/031/themes/common/logo-8584365049838548503-1774153804-b5ca8e4d0619239bea7def6f263211ed1774153804-480-0.webp" alt="LOUDER.ink" style="display:inline-block;max-width:280px;width:100%;height:auto;"/>
   </td></tr>
   <tr><td style="padding:40px 40px 20px;">
     <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111;line-height:1.2;">${h.title}</h2>
     <p style="margin:0 0 32px;font-size:15px;color:#666;line-height:1.5;">${firstName ? `Oi ${firstName}, ` : ""}${h.subtitle.charAt(0).toLowerCase() + h.subtitle.slice(1)}</p>
   </td></tr>
    <tr><td style="padding:0 36px;">${productGrid}</td></tr>
   <tr><td style="padding:20px 40px 0;">
     <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:2px solid #111;"><tr><td style="padding:16px 0;">
       <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
         <td style="font-size:14px;color:#666;text-transform:uppercase;letter-spacing:1px;">Total</td>
         <td style="text-align:right;font-size:22px;font-weight:700;color:#111;">${totalFormatted}</td>
       </tr></table>
     </td></tr></table>
   </td></tr>
   ${recoveryUrl ? `<tr><td style="padding:32px 40px;text-align:center;">
      <a href="${recoveryUrl}" style="display:inline-block;background:${h.ctaColor};color:${h.ctaColor === "#f59e0b" ? "#000" : "#fff"};padding:16px 48px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;">${h.ctaText} →</a>
   </td></tr>` : ""}
   <tr><td style="padding:0 40px 40px;text-align:center;">
     <p style="margin:0;font-size:13px;color:#999;font-style:italic;">${stepType === "incentivo" ? "Esse carrinho libera algo exclusivo depois da compra." : "Isso não ficou aí por acaso."}</p>
   </td></tr>
   <tr><td style="background:#000;padding:32px 40px;text-align:center;">
     <p style="margin:0 0 8px;font-size:16px;font-weight:700;letter-spacing:2px;color:#fff;opacity:0.9;">LOUDER.ink</p>
     <p style="margin:0 0 16px;font-size:11px;color:#fff;opacity:0.4;letter-spacing:1px;">Vista sua atitude</p>
     <p style="margin:0;font-size:11px;color:#fff;opacity:0.3;">© ${new Date().getFullYear()} LOUDER.ink — Todos os direitos reservados</p>
   </td></tr>
 </table>
 </td></tr></table></body></html>`;
 
   return { subject, html };
 }