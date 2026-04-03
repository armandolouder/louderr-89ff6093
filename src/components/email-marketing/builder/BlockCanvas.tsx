import { useState } from "react";
import { EmailBlock, BlockType } from "./types";
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlockCanvasProps {
  blocks: EmailBlock[];
  selectedBlockId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onDropNewBlock: (type: BlockType, index: number) => void;
}

const BLOCK_LABELS: Record<BlockType, string> = {
  header: "Header",
  text: "Texto",
  image: "Imagem",
  button: "Botão",
  products: "Produtos",
  divider: "Divisor",
  spacer: "Espaço",
  footer: "Rodapé",
  testimonial: "Depoimento",
  columns: "Colunas",
};

function BlockPreview({ block }: { block: EmailBlock }) {
  const s = block.styles;
  const c = block.content;

  switch (block.type) {
    case "header":
      return (
        <div style={{ background: s.backgroundColor, padding: s.padding, textAlign: s.textAlign as any }}>
          <h2 style={{ margin: 0, color: s.textColor, fontSize: s.fontSize, letterSpacing: "2px", fontWeight: 700 }}>{c.title}</h2>
          {c.subtitle && <p style={{ margin: "8px 0 0", color: s.textColor, opacity: 0.8, fontSize: "14px" }}>{c.subtitle}</p>}
        </div>
      );
    case "text":
      return (
        <div style={{ background: s.backgroundColor, padding: s.padding }}>
          <p style={{ margin: 0, fontSize: s.fontSize, color: s.textColor, lineHeight: s.lineHeight, whiteSpace: "pre-wrap" }}>{c.text}</p>
        </div>
      );
    case "image":
      return (
        <div style={{ background: s.backgroundColor, padding: s.padding, textAlign: s.textAlign as any }}>
          <img src={c.src} alt={c.alt} style={{ width: s.width, maxWidth: "100%", borderRadius: s.borderRadius, display: "inline-block" }} />
        </div>
      );
    case "button":
      return (
        <div style={{ background: s.backgroundColor, padding: s.padding, textAlign: s.textAlign as any }}>
          <span style={{ display: "inline-block", background: s.buttonColor, color: s.buttonTextColor, padding: "14px 32px", borderRadius: s.borderRadius, fontWeight: 700, fontSize: s.fontSize }}>{c.text}</span>
        </div>
      );
    case "products":
      return (
        <div style={{ background: s.backgroundColor, padding: s.padding }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${s.columns || 2}, 1fr)`, gap: s.gap || "8px" }}>
            {(c.products || []).map((p: any, i: number) => (
              <div key={i} style={{ overflow: "hidden" }}>
                <div style={{ background: "#f0f0f0", overflow: "hidden" }}>
                  <img src={p.image} alt={p.name} style={{ width: "100%", display: "block", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "8px 4px" }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "12px", color: "#111", textTransform: "uppercase", lineHeight: 1.3 }}>{p.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {p.oldPrice && <span style={{ fontSize: "12px", color: "#999", textDecoration: "line-through" }}>{p.oldPrice}</span>}
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#000" }}>{p.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "divider":
      return (
        <div style={{ background: s.backgroundColor, padding: s.padding }}>
          <hr style={{ border: "none", borderTop: `${s.lineWidth} solid ${s.lineColor}`, margin: 0 }} />
        </div>
      );
    case "spacer":
      return <div style={{ background: s.backgroundColor, height: s.height }} />;
    case "footer":
      return (
        <div style={{ background: s.backgroundColor, padding: s.padding, textAlign: s.textAlign as any }}>
          <p style={{ margin: 0, fontSize: s.fontSize, color: s.textColor }}>{c.text}<br /><span style={{ textDecoration: "underline" }}>{c.unsubscribeText}</span></p>
        </div>
      );
    case "testimonial":
      return (
        <div style={{ background: s.backgroundColor, padding: s.padding }}>
          <div style={{ borderLeft: `4px solid ${s.borderLeftColor}`, paddingLeft: "20px" }}>
            <p style={{ margin: "0 0 8px", fontSize: s.fontSize, color: s.textColor, fontStyle: "italic" }}>{c.quote}</p>
            <p style={{ margin: 0, fontSize: "13px", color: s.textColor, fontWeight: 700 }}>{c.author}</p>
          </div>
        </div>
      );
    case "columns":
      return (
        <div style={{ background: s.backgroundColor, padding: s.padding, display: "grid", gridTemplateColumns: `repeat(${(c.columns || []).length}, 1fr)`, gap: "16px" }}>
          {(c.columns || []).map((col: any, i: number) => (
            <div key={i}>
              <h4 style={{ margin: "0 0 4px", fontSize: "15px", color: s.textColor }}>{col.title}</h4>
              <p style={{ margin: 0, fontSize: "13px", color: s.textColor, lineHeight: 1.5 }}>{col.text}</p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function BlockCanvas({ blocks, selectedBlockId, onSelect, onRemove, onDuplicate, onMove, onDropNewBlock }: BlockCanvasProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData("block-type") as BlockType;
    const fromIdx = e.dataTransfer.getData("block-index");

    if (blockType && !fromIdx) {
      onDropNewBlock(blockType, index);
    } else if (fromIdx !== "") {
      onMove(parseInt(fromIdx), index);
    }
    setDragOverIndex(null);
    setDragFromIndex(null);
  };

  return (
    <div
      className="flex-1 overflow-auto p-6 bg-muted/30"
      onClick={() => onSelect(null)}
      onDragOver={(e) => { e.preventDefault(); setDragOverIndex(blocks.length); }}
      onDrop={(e) => handleDrop(e, blocks.length)}
    >
      <div className="max-w-[640px] mx-auto">
        {blocks.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
            <p className="text-sm font-medium">Arraste blocos aqui ou clique na paleta</p>
            <p className="text-xs mt-1">Comece adicionando um Header</p>
          </div>
        )}

        {blocks.map((block, index) => (
          <div key={block.id}>
            {/* Drop zone indicator */}
            <div
              className={cn("h-1 rounded transition-all", dragOverIndex === index ? "bg-primary h-2 my-1" : "")}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            />
            <div
              className={cn(
                "group relative rounded-lg border-2 transition-all cursor-pointer",
                selectedBlockId === block.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-border"
              )}
              onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("block-index", index.toString());
                setDragFromIndex(index);
              }}
              onDragEnd={() => { setDragFromIndex(null); setDragOverIndex(null); }}
            >
              {/* Toolbar */}
              <div className={cn(
                "absolute -top-3 left-2 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-sm z-10 transition-opacity",
                selectedBlockId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}>
                <span className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">{BLOCK_LABELS[block.type]}</span>
                <button onClick={(e) => { e.stopPropagation(); index > 0 && onMove(index, index - 1); }} className="p-1 hover:text-foreground text-muted-foreground"><ChevronUp className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); index < blocks.length - 1 && onMove(index, index + 1); }} className="p-1 hover:text-foreground text-muted-foreground"><ChevronDown className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); onDuplicate(block.id); }} className="p-1 hover:text-foreground text-muted-foreground"><Copy className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); onRemove(block.id); }} className="p-1 hover:text-destructive text-muted-foreground"><Trash2 className="w-3 h-3" /></button>
                <div className="p-1 cursor-grab text-muted-foreground"><GripVertical className="w-3 h-3" /></div>
              </div>

              {/* Block preview */}
              <div className="overflow-hidden rounded-md" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                <BlockPreview block={block} />
              </div>
            </div>
          </div>
        ))}

        {/* Final drop zone */}
        {blocks.length > 0 && (
          <div
            className={cn("h-1 rounded transition-all", dragOverIndex === blocks.length ? "bg-primary h-2 my-1" : "")}
            onDragOver={(e) => handleDragOver(e, blocks.length)}
            onDrop={(e) => handleDrop(e, blocks.length)}
          />
        )}
      </div>
    </div>
  );
}
