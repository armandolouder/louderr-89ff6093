import { Type, Image, MousePointerClick, ShoppingBag, Minus, Space, AlignLeft, Quote, Columns, LayoutTemplate } from "lucide-react";
import { BlockType } from "./types";

const PALETTE_ITEMS: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: "header", label: "Header", icon: <LayoutTemplate className="w-4 h-4" /> },
  { type: "text", label: "Texto", icon: <Type className="w-4 h-4" /> },
  { type: "image", label: "Imagem", icon: <Image className="w-4 h-4" /> },
  { type: "button", label: "Botão", icon: <MousePointerClick className="w-4 h-4" /> },
  { type: "products", label: "Produtos", icon: <ShoppingBag className="w-4 h-4" /> },
  { type: "columns", label: "Colunas", icon: <Columns className="w-4 h-4" /> },
  { type: "testimonial", label: "Depoimento", icon: <Quote className="w-4 h-4" /> },
  { type: "divider", label: "Divisor", icon: <Minus className="w-4 h-4" /> },
  { type: "spacer", label: "Espaço", icon: <Space className="w-4 h-4" /> },
  { type: "footer", label: "Rodapé", icon: <AlignLeft className="w-4 h-4" /> },
];

interface BlockPaletteProps {
  onAdd: (type: BlockType) => void;
  onDragStart: (type: BlockType) => void;
}

export function BlockPalette({ onAdd, onDragStart }: BlockPaletteProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Blocos</p>
      {PALETTE_ITEMS.map((item) => (
        <button
          key={item.type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("block-type", item.type);
            onDragStart(item.type);
          }}
          onClick={() => onAdd(item.type)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-grab active:cursor-grabbing"
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
