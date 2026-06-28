/**
 * Substituição de variáveis dinâmicas em mensagens (WhatsApp e Email).
 * Centraliza o vocabulário usado em jornadas, recovery e automações.
 */

export interface JourneyProduct {
  name?: string;
  quantity?: number;
  price?: number;
  image?: string;
  variant?: string;
}

export interface VariableContext {
  customerName?: string | null;
  orderNumber?: string | null;
  total?: number | null;
  products?: JourneyProduct[] | null;
  checkoutSuccessUrl?: string | null;
  checkoutUrl?: string | null;
  recoveryUrl?: string | null;
  boletoUrl?: string | null;
  trackingCode?: string | null;
  /** Variáveis adicionais ad-hoc no formato `[chave]` → valor. */
  extras?: Record<string, string | number | undefined | null>;
}

function firstName(name: string | null | undefined): string {
  if (!name) return "";
  return String(name).trim().split(/\s+/)[0] ?? "";
}

function formatBRL(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function formatProductsList(products: JourneyProduct[] | null | undefined): string {
  if (!products?.length) return "";
  return products
    .map((p) => `${p.quantity ?? 1}x ${p.name ?? "Produto"}`)
    .join("\n");
}

/**
 * Substitui variáveis no formato `[chave]` (estilo WhatsApp/jornadas).
 * Variáveis ausentes são substituídas por string vazia para não vazar placeholders.
 */
export function replaceWhatsappVariables(content: string, ctx: VariableContext): string {
  if (!content) return "";

  const paymentLink = ctx.checkoutUrl || ctx.recoveryUrl || "";

  const map: Record<string, string> = {
    nome_cliente: firstName(ctx.customerName),
    numero_pedido: ctx.orderNumber ?? "",
    total_pedido: ctx.total !== null && ctx.total !== undefined ? formatBRL(ctx.total) : "",
    lista_produtos: formatProductsList(ctx.products),
    url_sucesso_pedido: ctx.checkoutSuccessUrl ?? "",
    url_sucesso: ctx.checkoutSuccessUrl ?? "",
    link_pagamento: paymentLink,
    link_recuperacao: paymentLink,
    link_checkout: paymentLink,
    link_boleto: ctx.boletoUrl ?? "",
    codigo_rastreio: ctx.trackingCode ?? "",
  };

  for (const [k, v] of Object.entries(ctx.extras ?? {})) {
    map[k] = v === null || v === undefined ? "" : String(v);
  }

  let out = content;
  for (const [key, value] of Object.entries(map)) {
    // [chave] — escape de chave não é necessário pois são identificadores conhecidos
    out = out.replace(new RegExp(`\\[${key}\\]`, "gi"), value);
  }
  return out;
}

/**
 * Substitui variáveis estilo email `{{nome}}` (case-insensitive) — usado em templates Brevo.
 */
export function replaceEmailVariables(content: string, ctx: { customerName?: string | null }): string {
  if (!content) return "";
  return content.replace(/\{\{nome\}\}/gi, firstName(ctx.customerName) || "Cliente");
}