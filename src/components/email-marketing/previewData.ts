export const PREVIEW_NAME = "Maria";
export const PREVIEW_EMAIL = "maria@email.com";
export const PREVIEW_TOTAL = "R$ 379,80";
export const PREVIEW_RECOVERY_URL = "https://louder.ink/checkout/exemplo";

export const PRODUCTS_PREVIEW_HTML = `<table cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td width="50%" style="padding:6px;vertical-align:top;">
      <div style="border:1px solid #e5e5e5;overflow:hidden;background:#fff;">
        <img src="https://placehold.co/300x380/111111/ffffff?text=LOUDER" alt="Camiseta LOUDER Dark" style="width:100%;display:block;" />
        <div style="padding:8px 10px;">
          <div style="font-size:12px;font-weight:700;color:#111;text-transform:uppercase;line-height:1.3;">CAMISETA LOUDER DARK</div>
          <div style="font-size:11px;color:#888;margin-top:3px;">Tam: G • Qtd: 1</div>
          <div style="font-size:13px;font-weight:700;color:#000;margin-top:4px;">R$ 129,90</div>
        </div>
      </div>
    </td>
    <td width="50%" style="padding:6px;vertical-align:top;">
      <div style="border:1px solid #e5e5e5;overflow:hidden;background:#fff;">
        <img src="https://placehold.co/300x380/1a1a1a/ffffff?text=LOUDER" alt="Moletom LOUDER Post-Punk" style="width:100%;display:block;" />
        <div style="padding:8px 10px;">
          <div style="font-size:12px;font-weight:700;color:#111;text-transform:uppercase;line-height:1.3;">MOLETOM LOUDER POST-PUNK</div>
          <div style="font-size:11px;color:#888;margin-top:3px;">Cor: Preto • Qtd: 1</div>
          <div style="font-size:13px;font-weight:700;color:#000;margin-top:4px;">R$ 249,90</div>
        </div>
      </div>
    </td>
  </tr>
</table>`;

interface PreviewOptions {
  name?: string;
  email?: string;
  unsubscribeUrl?: string;
  recoveryUrl?: string;
  total?: string;
  productsHtml?: string;
}

export function renderEmailPreview(html: string, options: PreviewOptions = {}) {
  const name = options.name ?? PREVIEW_NAME;
  const email = options.email ?? PREVIEW_EMAIL;
  const unsubscribeUrl = options.unsubscribeUrl ?? "#";
  const recoveryUrl = options.recoveryUrl ?? PREVIEW_RECOVERY_URL;
  const total = options.total ?? PREVIEW_TOTAL;
  const productsHtml = options.productsHtml ?? PRODUCTS_PREVIEW_HTML;

  return html
    .replace(/\{\{nome\}\}/gi, name)
    .replace(/\{\{email\}\}/gi, email)
    .replace(/\{\{unsubscribe_url\}\}/gi, unsubscribeUrl)
    .replace(/\{\{recovery_url\}\}/gi, recoveryUrl)
    .replace(/\{\{total\}\}/gi, total)
    .replace(/\{\{produtos\}\}/gi, productsHtml)
    .replace(/\[nome_cliente\]/gi, name)
    .replace(/\[email_cliente\]/gi, email)
    .replace(/\[link_recuperacao\]/gi, recoveryUrl)
    .replace(/\[total_pedido\]/gi, total);
}
