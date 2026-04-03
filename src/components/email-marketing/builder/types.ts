export type BlockType =
  | "header"
  | "text"
  | "image"
  | "button"
  | "products"
  | "divider"
  | "spacer"
  | "footer"
  | "testimonial"
  | "columns";

export interface EmailBlock {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  styles: Record<string, string>;
}

export interface BuilderState {
  blocks: EmailBlock[];
  selectedBlockId: string | null;
  globalStyles: {
    backgroundColor: string;
    contentWidth: string;
    fontFamily: string;
    borderRadius: string;
  };
}

export const BLOCK_DEFAULTS: Record<BlockType, () => Omit<EmailBlock, "id">> = {
  header: () => ({
    type: "header",
    content: {
      title: "SUA MARCA",
      subtitle: "",
      logoUrl: "",
    },
    styles: {
      backgroundColor: "#000000",
      textColor: "#ffffff",
      padding: "32px 40px",
      textAlign: "center",
      fontSize: "24px",
    },
  }),
  text: () => ({
    type: "text",
    content: {
      text: "Olá, {{nome}}! 👋\n\nEscreva sua mensagem aqui. Use variáveis como {{nome}} e {{email}} para personalizar o conteúdo do seu email.",
    },
    styles: {
      backgroundColor: "#ffffff",
      textColor: "#333333",
      padding: "24px 40px",
      fontSize: "15px",
      lineHeight: "1.6",
    },
  }),
  image: () => ({
    type: "image",
    content: {
      src: "https://placehold.co/600x300/000000/FFFFFF?text=Sua+Imagem",
      alt: "Imagem do email",
      link: "",
    },
    styles: {
      backgroundColor: "#ffffff",
      padding: "16px 40px",
      textAlign: "center",
      width: "100%",
      borderRadius: "0",
    },
  }),
  button: () => ({
    type: "button",
    content: {
      text: "CLIQUE AQUI →",
      link: "#",
    },
    styles: {
      backgroundColor: "#ffffff",
      buttonColor: "#000000",
      buttonTextColor: "#ffffff",
      padding: "24px 40px",
      textAlign: "center",
      borderRadius: "0",
      fontSize: "14px",
    },
  }),
  products: () => ({
    type: "products",
    content: {
      products: [
        { image: "https://placehold.co/300x380/f5f5f5/333?text=Produto+1", name: "PRODUTO 1", price: "R$ 99,90", oldPrice: "R$ 119,90", link: "#" },
        { image: "https://placehold.co/300x380/f5f5f5/333?text=Produto+2", name: "PRODUTO 2", price: "R$ 99,90", oldPrice: "R$ 109,90", link: "#" },
      ],
    },
    styles: {
      backgroundColor: "#ffffff",
      padding: "10px",
      columns: "2",
      gap: "8px",
    },
  }),
  divider: () => ({
    type: "divider",
    content: {},
    styles: {
      backgroundColor: "#ffffff",
      lineColor: "#e0e0e0",
      padding: "8px 40px",
      lineWidth: "1px",
    },
  }),
  spacer: () => ({
    type: "spacer",
    content: {},
    styles: {
      backgroundColor: "#ffffff",
      height: "32px",
    },
  }),
  footer: () => ({
    type: "footer",
    content: {
      text: "Você recebeu este email porque está cadastrado em nossa base.",
      unsubscribeText: "Cancelar inscrição",
    },
    styles: {
      backgroundColor: "#f9f9f9",
      textColor: "#999999",
      padding: "24px 40px",
      fontSize: "11px",
      textAlign: "center",
    },
  }),
  testimonial: () => ({
    type: "testimonial",
    content: {
      quote: '"Produto incrível! Recomendo para todos."',
      author: "Maria Silva",
      role: "Cliente desde 2024",
    },
    styles: {
      backgroundColor: "#f9f9f9",
      textColor: "#333333",
      padding: "32px 40px",
      fontSize: "16px",
      borderLeftColor: "#000000",
    },
  }),
  columns: () => ({
    type: "columns",
    content: {
      columns: [
        { title: "Coluna 1", text: "Conteúdo da primeira coluna." },
        { title: "Coluna 2", text: "Conteúdo da segunda coluna." },
      ],
    },
    styles: {
      backgroundColor: "#ffffff",
      textColor: "#333333",
      padding: "24px 40px",
    },
  }),
};
