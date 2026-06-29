import { EmailBlock } from "./builder/types";

const LOGO_URL =
  "https://acdn-us.mitiendanube.com/stores/002/778/031/themes/common/logo-507807513-1674425349-aa10b3e5b7752a1b2b57c619e6ba49b41674425349-640-0.webp";

export interface RecoveryVariant {
  /** Chave técnica usada pelo motor (message_type). NÃO alterar. */
  key: string;
  label: string;
  description: string;
  subject: string;
  ctaText: string;
  ctaColor: string;
  title: string;
  subtitle: string;
  note: string;
}

export const RECOVERY_VARIANTS: RecoveryVariant[] = [
  {
    key: "emocional",
    label: "Emocional",
    description: "Tom afetivo e próximo. Lembra o cliente do que ficou pra trás.",
    subject: "{{nome}}, você deixou isso aqui 💜",
    ctaText: "FINALIZAR COMPRA →",
    ctaColor: "#000000",
    title: "Você deixou isso aqui.",
    subtitle: "Esses itens não ficaram aí por acaso.",
    note: "Isso não ficou aí por acaso.",
  },
  {
    key: "urgencia",
    label: "Urgência",
    description: "Senso de escassez. Estoque limitado, ação imediata.",
    subject: "⚡ {{nome}}, seus itens podem esgotar!",
    ctaText: "GARANTIR AGORA →",
    ctaColor: "#dc2626",
    title: "Corre, esses itens são limitados.",
    subtitle: "O estoque tá acabando e a gente não quer que você perca.",
    note: "Estoque limitado — não deixa pra depois.",
  },
  {
    key: "incentivo",
    label: "Incentivo",
    description: "Oferece um bônus/exclusividade ao finalizar.",
    subject: "🎁 {{nome}}, temos algo especial pra você",
    ctaText: "QUERO MEU BÔNUS →",
    ctaColor: "#000000",
    title: "Esse carrinho libera algo exclusivo.",
    subtitle: "Finalize sua compra e desbloqueie um conteúdo especial da LOUDER.",
    note: "Esse carrinho libera algo exclusivo depois da compra.",
  },
  {
    key: "ultima_chamada",
    label: "Última Chamada",
    description: "Último lembrete antes de limpar o carrinho.",
    subject: "⏰ Última chance, {{nome}}!",
    ctaText: "FINALIZAR COMPRA →",
    ctaColor: "#f59e0b",
    title: "Última chamada.",
    subtitle: "Seu carrinho será limpo em breve. Essa é a última vez que vamos te lembrar.",
    note: "Essa é a última vez que vamos te lembrar.",
  },
  {
    key: "leve",
    label: "Leve",
    description: "Direto e descomplicado. Só finalizar.",
    subject: "{{nome}}, separamos seu carrinho 👋",
    ctaText: "FINALIZAR COMPRA →",
    ctaColor: "#000000",
    title: "Separamos tudo pra você.",
    subtitle: "É só finalizar a compra. Rápido e fácil.",
    note: "Rápido, fácil e sem complicação.",
  },
];

const SAMPLE_PRODUCTS = [
  {
    image: "https://placehold.co/300x380/111111/ffffff?text=LOUDER",
    name: "PRODUTO DO CARRINHO 1",
    price: "R$ 129,90",
    link: "{{recovery_url}}",
  },
  {
    image: "https://placehold.co/300x380/1a1a1a/ffffff?text=LOUDER",
    name: "PRODUTO DO CARRINHO 2",
    price: "R$ 249,90",
    link: "{{recovery_url}}",
  },
];

export function buildRecoveryBlocks(v: RecoveryVariant): EmailBlock[] {
  return [
    {
      id: `${v.key}-header`,
      type: "header",
      content: { title: "LOUDER.ink", subtitle: "", logoUrl: LOGO_URL },
      styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "24px 40px", textAlign: "center", fontSize: "24px" },
    },
    {
      id: `${v.key}-title`,
      type: "text",
      content: { text: v.title },
      styles: { backgroundColor: "#ffffff", textColor: "#111111", padding: "40px 40px 8px", fontSize: "24px", lineHeight: "1.2" },
    },
    {
      id: `${v.key}-subtitle`,
      type: "text",
      content: { text: `Oi {{nome}}, ${v.subtitle.charAt(0).toLowerCase() + v.subtitle.slice(1)}` },
      styles: { backgroundColor: "#ffffff", textColor: "#666666", padding: "0 40px 24px", fontSize: "15px", lineHeight: "1.5" },
    },
    {
      id: `${v.key}-products`,
      type: "products",
      content: { dynamic: true, products: SAMPLE_PRODUCTS },
      styles: { backgroundColor: "#ffffff", padding: "0 36px", columns: "2", nameColor: "#111111", priceColor: "#000000", oldPriceColor: "#999999" },
    },
    {
      id: `${v.key}-total`,
      type: "text",
      content: { text: "TOTAL: {{total}}" },
      styles: { backgroundColor: "#ffffff", textColor: "#111111", padding: "20px 40px 4px", fontSize: "18px", lineHeight: "1.4" },
    },
    {
      id: `${v.key}-cta`,
      type: "button",
      content: { text: v.ctaText, link: "{{recovery_url}}" },
      styles: { backgroundColor: "#ffffff", buttonColor: v.ctaColor, buttonTextColor: v.ctaColor === "#f59e0b" ? "#000000" : "#ffffff", padding: "24px 40px", textAlign: "center", borderRadius: "4px", fontSize: "14px" },
    },
    {
      id: `${v.key}-note`,
      type: "text",
      content: { text: v.note },
      styles: { backgroundColor: "#ffffff", textColor: "#999999", padding: "0 40px 32px", fontSize: "13px", lineHeight: "1.4" },
    },
    {
      id: `${v.key}-footer`,
      type: "footer",
      content: { text: "LOUDER.ink • Vista sua atitude", unsubscribeText: "Cancelar inscrição" },
      styles: { backgroundColor: "#000000", textColor: "#ffffff", padding: "32px 40px", fontSize: "11px", textAlign: "center" },
    },
  ];
}