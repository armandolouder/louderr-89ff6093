import { useState } from "react";
import { Type, Image, MousePointerClick, ShoppingBag, Minus, Space, AlignLeft, Quote, Columns, LayoutTemplate, Variable, Copy, ChevronDown, ChevronRight } from "lucide-react";
import { BlockType } from "./types";
import { toast } from "sonner";

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

const VARIABLES = [
  { group: "Geral", items: [
    { variable: "{{nome}}", label: "Nome do cliente", description: "Primeiro nome" },
    { variable: "{{email}}", label: "Email", description: "Email do cliente" },
    { variable: "{{unsubscribe_url}}", label: "Link opt-out", description: "URL de descadastro" },
  ]},
  { group: "Recuperação", items: [
    { variable: "{{recovery_url}}", label: "Link do carrinho", description: "URL de checkout abandonado" },
    { variable: "{{total}}", label: "Total do carrinho", description: "Valor total formatado (R$)" },
    { variable: "{{produtos}}", label: "Grid de produtos", description: "Tabela 2 colunas com imagem e preço" },
  ]},
];

interface BlockPaletteProps {
  onAdd: (type: BlockType) => void;
  onDragStart: (type: BlockType) => void;
}

export function BlockPalette({ onAdd, onDragStart }: BlockPaletteProps) {
  const [showVars, setShowVars] = useState(false);

  const copyVariable = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success(`Variável ${v} copiada!`);
  };

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

      <div className="pt-3 mt-3 border-t border-border">
        <button
          onClick={() => setShowVars(!showVars)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-secondary/60 transition-colors"
        >
          <Variable className="w-4 h-4" />
          Variáveis
          {showVars ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
        </button>

        {showVars && (
          <div className="space-y-3 mt-1">
            {VARIABLES.map((group) => (
              <div key={group.group}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">{group.group}</p>
                {group.items.map((item) => (
                  <button
                    key={item.variable}
                    onClick={() => copyVariable(item.variable)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors group"
                    title={item.description}
                  >
                    <code className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-mono">{item.variable}</code>
                    <Copy className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground px-3 leading-relaxed">
              Clique para copiar. Cole em blocos de Texto ou Botão.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
