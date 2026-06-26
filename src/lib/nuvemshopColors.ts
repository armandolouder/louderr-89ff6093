// Cores reconhecidas pela Nuvemshop.
// O nome PRECISA ser exatamente igual (acentos, espaços e maiúsculas) para a
// loja pintar a bolinha da cor automaticamente. Qualquer nome fora desta lista
// aparece como uma bolinha cinza no site.
// Fonte: https://atendimento.nuvemshop.com.br/personalizacao-avancada-do-layout/quais-cores-usar-no-layout-e-nas-variacoes-de-produtos

export interface NuvemColor {
  nome: string;
  hex: string;
  grupo: string;
}

export const NUVEM_COLORS: NuvemColor[] = [
  // Tons de cinza
  { nome: "Preto", hex: "#000000", grupo: "Cinza" },
  { nome: "Preto fosco", hex: "#1C1C1C", grupo: "Cinza" },
  { nome: "Chumbo", hex: "#4E5355", grupo: "Cinza" },
  { nome: "Grafite", hex: "#383838", grupo: "Cinza" },
  { nome: "Cinza escuro", hex: "#666666", grupo: "Cinza" },
  { nome: "Cinza", hex: "#808080", grupo: "Cinza" },
  { nome: "Cinza claro", hex: "#D3D3D3", grupo: "Cinza" },
  { nome: "Prata", hex: "#C0C0C0", grupo: "Cinza" },
  { nome: "Platina", hex: "#E5E4E2", grupo: "Cinza" },
  { nome: "Cimento", hex: "#A8A8A8", grupo: "Cinza" },
  { nome: "Taupe", hex: "#483C32", grupo: "Cinza" },
  { nome: "Fumê", hex: "#B2BEB5", grupo: "Cinza" },
  { nome: "Gelo", hex: "#F5F5F5", grupo: "Cinza" },
  { nome: "Off white", hex: "#FAF9F6", grupo: "Cinza" },
  { nome: "Branco", hex: "#FFFFFF", grupo: "Cinza" },

  // Tons de azul
  { nome: "Azul escuro", hex: "#000080", grupo: "Azul" },
  { nome: "Azul marinho", hex: "#1B1F3B", grupo: "Azul" },
  { nome: "Azul royal", hex: "#4169E1", grupo: "Azul" },
  { nome: "Azul bic", hex: "#194E92", grupo: "Azul" },
  { nome: "Azul", hex: "#0000FF", grupo: "Azul" },
  { nome: "Azul céu", hex: "#87CEEB", grupo: "Azul" },
  { nome: "Azul claro", hex: "#ADD8E6", grupo: "Azul" },
  { nome: "Azul bebê", hex: "#B8E9EE", grupo: "Azul" },
  { nome: "Azul petróleo", hex: "#084D6E", grupo: "Azul" },
  { nome: "Azul piscina", hex: "#00BFFF", grupo: "Azul" },
  { nome: "Azul Tiffany", hex: "#0ABAB5", grupo: "Azul" },
  { nome: "Azul turquesa", hex: "#40E0D0", grupo: "Azul" },
  { nome: "Ciano", hex: "#00FFFF", grupo: "Azul" },
  { nome: "Azul jeans", hex: "#1560BD", grupo: "Azul" },
  { nome: "Jeans escuro", hex: "#1D4768", grupo: "Azul" },
  { nome: "Jeans claro", hex: "#8FBADC", grupo: "Azul" },

  // Tons de verde
  { nome: "Verde escuro", hex: "#006400", grupo: "Verde" },
  { nome: "Verde bandeira", hex: "#009246", grupo: "Verde" },
  { nome: "Verde", hex: "#008000", grupo: "Verde" },
  { nome: "Verde claro", hex: "#90EE90", grupo: "Verde" },
  { nome: "Verde militar", hex: "#556B2F", grupo: "Verde" },
  { nome: "Verde musgo", hex: "#6B8E23", grupo: "Verde" },
  { nome: "Verde oliva", hex: "#808000", grupo: "Verde" },
  { nome: "Verde bebê", hex: "#ADDFAD", grupo: "Verde" },
  { nome: "Verde água", hex: "#7FFFD4", grupo: "Verde" },
  { nome: "Verde neon", hex: "#39FF14", grupo: "Verde" },
  { nome: "Verde limão", hex: "#9ACD32", grupo: "Verde" },
  { nome: "Pêra", hex: "#D1E231", grupo: "Verde" },

  // Tons de marrom e amarelo
  { nome: "Marrom escuro", hex: "#654321", grupo: "Marrom/Amarelo" },
  { nome: "Chocolate", hex: "#6F4E37", grupo: "Marrom/Amarelo" },
  { nome: "Marrom", hex: "#7B4A27", grupo: "Marrom/Amarelo" },
  { nome: "Marrom claro", hex: "#B5651D", grupo: "Marrom/Amarelo" },
  { nome: "Castanho", hex: "#5C4033", grupo: "Marrom/Amarelo" },
  { nome: "Café", hex: "#6F4E37", grupo: "Marrom/Amarelo" },
  { nome: "Madeira", hex: "#A0522D", grupo: "Marrom/Amarelo" },
  { nome: "Caramelo", hex: "#C68E17", grupo: "Marrom/Amarelo" },
  { nome: "Cobre", hex: "#B87333", grupo: "Marrom/Amarelo" },
  { nome: "Siena", hex: "#882D17", grupo: "Marrom/Amarelo" },
  { nome: "Tabaco", hex: "#6F5C43", grupo: "Marrom/Amarelo" },
  { nome: "Avelã", hex: "#AE9F80", grupo: "Marrom/Amarelo" },
  { nome: "Champagne", hex: "#F7E7CE", grupo: "Marrom/Amarelo" },
  { nome: "Nude", hex: "#E3BC9A", grupo: "Marrom/Amarelo" },
  { nome: "Natural", hex: "#EAE0C8", grupo: "Marrom/Amarelo" },
  { nome: "Bege", hex: "#F5F5DC", grupo: "Marrom/Amarelo" },
  { nome: "Areia", hex: "#C2B280", grupo: "Marrom/Amarelo" },
  { nome: "Pérola", hex: "#EAE0C8", grupo: "Marrom/Amarelo" },
  { nome: "Creme", hex: "#FFFDD0", grupo: "Marrom/Amarelo" },
  { nome: "Marfim", hex: "#FFFFF0", grupo: "Marrom/Amarelo" },
  { nome: "Dourado ou Ouro", hex: "#FFD700", grupo: "Marrom/Amarelo" },
  { nome: "Âmbar", hex: "#FFBF00", grupo: "Marrom/Amarelo" },
  { nome: "Mostarda", hex: "#DAB30A", grupo: "Marrom/Amarelo" },
  { nome: "Mel", hex: "#EBA937", grupo: "Marrom/Amarelo" },
  { nome: "Milho", hex: "#FBEC5D", grupo: "Marrom/Amarelo" },
  { nome: "Palha", hex: "#E4D96F", grupo: "Marrom/Amarelo" },
  { nome: "Cáqui", hex: "#F0E68C", grupo: "Marrom/Amarelo" },
  { nome: "Amarelo", hex: "#FFFF00", grupo: "Marrom/Amarelo" },
  { nome: "Amarelo limão", hex: "#CCFF00", grupo: "Marrom/Amarelo" },
  { nome: "Amarelo neon", hex: "#FDE910", grupo: "Marrom/Amarelo" },

  // Tons de rosa e roxo
  { nome: "Indigo", hex: "#4B0082", grupo: "Rosa/Roxo" },
  { nome: "Uva ou Violeta", hex: "#663399", grupo: "Rosa/Roxo" },
  { nome: "Roxo", hex: "#800080", grupo: "Rosa/Roxo" },
  { nome: "Lilás", hex: "#B57EDC", grupo: "Rosa/Roxo" },
  { nome: "Lavanda", hex: "#E6E6FA", grupo: "Rosa/Roxo" },
  { nome: "Framboesa", hex: "#E30B5C", grupo: "Rosa/Roxo" },
  { nome: "Rose gold", hex: "#B76E79", grupo: "Rosa/Roxo" },
  { nome: "Rosa escuro", hex: "#C71585", grupo: "Rosa/Roxo" },
  { nome: "Rosa antigo", hex: "#C08081", grupo: "Rosa/Roxo" },
  { nome: "Rosa", hex: "#FFC0CB", grupo: "Rosa/Roxo" },
  { nome: "Rose", hex: "#FFB6C1", grupo: "Rosa/Roxo" },
  { nome: "Rosa bebê", hex: "#F4C2C2", grupo: "Rosa/Roxo" },
  { nome: "Rosa chiclete", hex: "#FF66CC", grupo: "Rosa/Roxo" },
  { nome: "Rosa neon", hex: "#FF6FFF", grupo: "Rosa/Roxo" },
  { nome: "Pink", hex: "#FF69B4", grupo: "Rosa/Roxo" },
  { nome: "Melancia", hex: "#FC6C85", grupo: "Rosa/Roxo" },
  { nome: "Fúcsia ou Magenta", hex: "#FF00FF", grupo: "Rosa/Roxo" },

  // Tons de vermelho e laranja
  { nome: "Vinho", hex: "#722F37", grupo: "Vermelho/Laranja" },
  { nome: "Bordô", hex: "#800000", grupo: "Vermelho/Laranja" },
  { nome: "Vermelho escuro", hex: "#8B0000", grupo: "Vermelho/Laranja" },
  { nome: "Vermelho", hex: "#DC0000", grupo: "Vermelho/Laranja" },
  { nome: "Tomate", hex: "#FF6347", grupo: "Vermelho/Laranja" },
  { nome: "Cereja", hex: "#990012", grupo: "Vermelho/Laranja" },
  { nome: "Morango", hex: "#BF3030", grupo: "Vermelho/Laranja" },
  { nome: "Grená", hex: "#733635", grupo: "Vermelho/Laranja" },
  { nome: "Marsala", hex: "#955251", grupo: "Vermelho/Laranja" },
  { nome: "Mogno", hex: "#C04000", grupo: "Vermelho/Laranja" },
  { nome: "Terra", hex: "#E2725B", grupo: "Vermelho/Laranja" },
  { nome: "Goiaba", hex: "#CD5C5C", grupo: "Vermelho/Laranja" },
  { nome: "Salmão", hex: "#FA8072", grupo: "Vermelho/Laranja" },
  { nome: "Coral", hex: "#FF7F50", grupo: "Vermelho/Laranja" },
  { nome: "Ferrugem ou Telha", hex: "#B7410E", grupo: "Vermelho/Laranja" },
  { nome: "Bronze", hex: "#CD7F32", grupo: "Vermelho/Laranja" },
  { nome: "Tangerina", hex: "#F28500", grupo: "Vermelho/Laranja" },
  { nome: "Laranja", hex: "#FFA500", grupo: "Vermelho/Laranja" },
  { nome: "Laranja neon", hex: "#FF6700", grupo: "Vermelho/Laranja" },
  { nome: "Pêssego", hex: "#FFCC99", grupo: "Vermelho/Laranja" },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const BY_NORM = new Map(NUVEM_COLORS.map((c) => [norm(c.nome), c]));

// Mapeia nomes "errados" comuns para o nome oficial reconhecido pela Nuvemshop.
const ALIASES: Record<string, string> = {
  "preta": "Preto",
  "branca": "Branco",
  "cinza chumbo": "Chumbo",
  "vermelha": "Vermelho",
  "amarela": "Amarelo",
  "laranja neon": "Laranja neon",
  "rosa pink": "Pink",
  "marinho": "Azul marinho",
};

/** Retorna a cor oficial Nuvemshop a partir de um nome (com correção de acentos/aliases). */
export function findNuvemColor(nome: string): NuvemColor | undefined {
  const n = norm(nome);
  if (BY_NORM.has(n)) return BY_NORM.get(n);
  const alias = ALIASES[n];
  if (alias) return BY_NORM.get(norm(alias));
  return undefined;
}

/** Hex para preview no app (cinza quando a cor não é reconhecida). */
export function colorHex(nome: string): string {
  return findNuvemColor(nome)?.hex ?? "#9ca3af";
}

/** true se o nome será pintado corretamente na Nuvemshop. */
export function isRecognized(nome: string): boolean {
  return !!findNuvemColor(nome);
}
