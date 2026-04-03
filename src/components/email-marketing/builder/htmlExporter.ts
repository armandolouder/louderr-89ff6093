import { EmailBlock, BuilderState } from "./types";

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
}

function renderBlock(block: EmailBlock): string {
  const s = block.styles;
  switch (block.type) {
    case "header":
      return `<tr><td style="background:${s.backgroundColor};padding:${s.padding};text-align:${s.textAlign};">
        ${block.content.logoUrl ? `<img src="${block.content.logoUrl}" alt="Logo" style="max-height:48px;margin-bottom:12px;" />` : ""}
        <h1 style="margin:0;color:${s.textColor};font-size:${s.fontSize};letter-spacing:2px;font-weight:700;">${escapeHtml(block.content.title)}</h1>
        ${block.content.subtitle ? `<p style="margin:8px 0 0;color:${s.textColor};opacity:0.8;font-size:14px;">${escapeHtml(block.content.subtitle)}</p>` : ""}
      </td></tr>`;

    case "text":
      return `<tr><td style="background:${s.backgroundColor};padding:${s.padding};">
        <p style="margin:0;font-size:${s.fontSize};color:${s.textColor};line-height:${s.lineHeight};">${escapeHtml(block.content.text)}</p>
      </td></tr>`;

    case "image": {
      const img = `<img src="${block.content.src}" alt="${block.content.alt || ""}" style="width:${s.width};max-width:100%;display:block;" />`;
      const wrapped = block.content.link ? `<a href="${block.content.link}" target="_blank">${img}</a>` : img;
      return `<tr><td style="background:${s.backgroundColor};padding:${s.padding};text-align:${s.textAlign};">${wrapped}</td></tr>`;
    }

    case "button":
      return `<tr><td style="background:${s.backgroundColor};padding:${s.padding};text-align:${s.textAlign};">
        <a href="${block.content.link}" target="_blank" style="display:inline-block;background:${s.buttonColor};color:${s.buttonTextColor};padding:14px 32px;text-decoration:none;font-weight:700;font-size:${s.fontSize};">${escapeHtml(block.content.text)}</a>
      </td></tr>`;

    case "products": {
      const cols = parseInt(s.columns || "2");
      const products = block.content.products || [];
      let rows = "";
      for (let i = 0; i < products.length; i += cols) {
        const cells = products.slice(i, i + cols).map((p: any) =>
          `<td style="padding:4px;text-align:left;width:${100 / cols}%;vertical-align:top;">
            <a href="${p.link || "#"}" style="text-decoration:none;color:inherit;display:block;">
              <div style="background:#f0f0f0;overflow:hidden;">
                <img src="${p.image}" alt="${p.name}" style="width:100%;display:block;" />
              </div>
              <div style="padding:8px 4px;">
                <p style="margin:0 0 4px;font-weight:700;font-size:12px;color:#111;text-transform:uppercase;line-height:1.3;">${escapeHtml(p.name)}</p>
                ${p.oldPrice ? `<span style="font-size:12px;color:#999;text-decoration:line-through;margin-right:6px;">${p.oldPrice}</span>` : ""}
                <span style="font-size:13px;font-weight:700;color:#000;">${p.price}</span>
              </div>
            </a>
          </td>`
        ).join("");
        rows += `<tr>${cells}</tr>`;
      }
      return `<tr><td style="background:${s.backgroundColor};padding:${s.padding};"><table cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table></td></tr>`;
    }

    case "divider":
      return `<tr><td style="background:${s.backgroundColor};padding:${s.padding};"><hr style="border:none;border-top:${s.lineWidth} solid ${s.lineColor};margin:0;" /></td></tr>`;

    case "spacer":
      return `<tr><td style="background:${s.backgroundColor};height:${s.height};font-size:0;line-height:0;">&nbsp;</td></tr>`;

    case "footer":
      return `<tr><td style="background:${s.backgroundColor};padding:${s.padding};text-align:${s.textAlign};">
        <p style="margin:0;font-size:${s.fontSize};color:${s.textColor};">
          ${escapeHtml(block.content.text)}
          <br/><a href="{{unsubscribe_url}}" style="color:${s.textColor};">${escapeHtml(block.content.unsubscribeText)}</a>
        </p>
      </td></tr>`;

    case "testimonial":
      return `<tr><td style="background:${s.backgroundColor};padding:${s.padding};">
        <div style="border-left:4px solid ${s.borderLeftColor};padding-left:20px;">
          <p style="margin:0 0 12px;font-size:${s.fontSize};color:${s.textColor};font-style:italic;">${escapeHtml(block.content.quote)}</p>
          <p style="margin:0;font-size:13px;color:${s.textColor};font-weight:700;">${escapeHtml(block.content.author)}</p>
          ${block.content.role ? `<p style="margin:2px 0 0;font-size:12px;color:#999;">${escapeHtml(block.content.role)}</p>` : ""}
        </div>
      </td></tr>`;

    case "columns": {
      const columns = block.content.columns || [];
      const cells = columns.map((col: any) =>
        `<td style="padding:8px;vertical-align:top;width:${100 / columns.length}%;">
          <h3 style="margin:0 0 8px;font-size:16px;color:${s.textColor};">${escapeHtml(col.title)}</h3>
          <p style="margin:0;font-size:14px;color:${s.textColor};line-height:1.5;">${escapeHtml(col.text)}</p>
        </td>`
      ).join("");
      return `<tr><td style="background:${s.backgroundColor};padding:${s.padding};"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${cells}</tr></table></td></tr>`;
    }

    default:
      return "";
  }
}

export function exportToHtml(state: BuilderState): string {
  const g = state.globalStyles;
  const blocksHtml = state.blocks.map(renderBlock).join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:${g.backgroundColor};font-family:${g.fontFamily};">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${g.backgroundColor};">
<tr><td align="center" style="padding:40px 20px;">
<table cellpadding="0" cellspacing="0" border="0" width="${g.contentWidth}" style="max-width:${g.contentWidth}px;background:#ffffff;overflow:hidden;">
${blocksHtml}
</table>
</td></tr>
</table>
</body>
</html>`;
}
