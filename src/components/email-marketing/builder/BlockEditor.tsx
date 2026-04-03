import { EmailBlock } from "./types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface BlockEditorProps {
  block: EmailBlock;
  onChange: (updates: Partial<EmailBlock>) => void;
}

function StyleField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const isColor = /color/i.test(label) || ["backgroundColor", "lineColor", "buttonColor", "buttonTextColor", "borderLeftColor"].some(k => label.includes(k));
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2 items-center">
        {isColor && (
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
        )}
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-xs h-8" />
      </div>
    </div>
  );
}

export function BlockEditor({ block, onChange }: BlockEditorProps) {
  const updateContent = (key: string, value: any) => {
    onChange({ content: { ...block.content, [key]: value } });
  };
  const updateStyle = (key: string, value: string) => {
    onChange({ styles: { ...block.styles, [key]: value } });
  };

  const STYLE_LABELS: Record<string, string> = {
    backgroundColor: "Fundo",
    textColor: "Cor do texto",
    padding: "Padding",
    fontSize: "Tamanho fonte",
    lineHeight: "Entrelinha",
    textAlign: "Alinhamento",
    borderRadius: "Borda arredondada",
    width: "Largura",
    buttonColor: "Cor do botão",
    buttonTextColor: "Cor texto botão",
    lineColor: "Cor da linha",
    lineWidth: "Espessura",
    height: "Altura",
    columns: "Colunas",
    borderLeftColor: "Cor borda",
  };

  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conteúdo</p>

      {/* Content fields by block type */}
      {block.type === "header" && (
        <>
          <div className="space-y-1"><Label className="text-xs">Título</Label><Input value={block.content.title} onChange={(e) => updateContent("title", e.target.value)} className="h-8 text-xs" /></div>
          <div className="space-y-1"><Label className="text-xs">Subtítulo</Label><Input value={block.content.subtitle} onChange={(e) => updateContent("subtitle", e.target.value)} className="h-8 text-xs" /></div>
          <div className="space-y-1"><Label className="text-xs">URL do Logo</Label><Input value={block.content.logoUrl} onChange={(e) => updateContent("logoUrl", e.target.value)} className="h-8 text-xs" placeholder="https://..." /></div>
        </>
      )}

      {block.type === "text" && (
        <div className="space-y-1"><Label className="text-xs">Texto</Label><Textarea value={block.content.text} onChange={(e) => updateContent("text", e.target.value)} className="text-xs min-h-[120px]" /></div>
      )}

      {block.type === "image" && (
        <>
          <div className="space-y-1"><Label className="text-xs">URL da Imagem</Label><Input value={block.content.src} onChange={(e) => updateContent("src", e.target.value)} className="h-8 text-xs" /></div>
          <div className="space-y-1"><Label className="text-xs">Texto alternativo</Label><Input value={block.content.alt} onChange={(e) => updateContent("alt", e.target.value)} className="h-8 text-xs" /></div>
          <div className="space-y-1"><Label className="text-xs">Link (opcional)</Label><Input value={block.content.link} onChange={(e) => updateContent("link", e.target.value)} className="h-8 text-xs" /></div>
        </>
      )}

      {block.type === "button" && (
        <>
          <div className="space-y-1"><Label className="text-xs">Texto do botão</Label><Input value={block.content.text} onChange={(e) => updateContent("text", e.target.value)} className="h-8 text-xs" /></div>
          <div className="space-y-1"><Label className="text-xs">URL</Label><Input value={block.content.link} onChange={(e) => updateContent("link", e.target.value)} className="h-8 text-xs" /></div>
        </>
      )}

      {block.type === "products" && (
        <div className="space-y-3">
          {(block.content.products || []).map((p: any, i: number) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Produto {i + 1}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                  const products = [...block.content.products];
                  products.splice(i, 1);
                  updateContent("products", products);
                }}><Trash2 className="w-3 h-3" /></Button>
              </div>
              <Input value={p.name} onChange={(e) => { const products = [...block.content.products]; products[i] = { ...p, name: e.target.value }; updateContent("products", products); }} placeholder="Nome" className="h-7 text-xs" />
              <Input value={p.price} onChange={(e) => { const products = [...block.content.products]; products[i] = { ...p, price: e.target.value }; updateContent("products", products); }} placeholder="Preço" className="h-7 text-xs" />
              <Input value={p.image} onChange={(e) => { const products = [...block.content.products]; products[i] = { ...p, image: e.target.value }; updateContent("products", products); }} placeholder="URL da imagem" className="h-7 text-xs" />
              <Input value={p.link} onChange={(e) => { const products = [...block.content.products]; products[i] = { ...p, link: e.target.value }; updateContent("products", products); }} placeholder="Link" className="h-7 text-xs" />
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => {
            updateContent("products", [...(block.content.products || []), { image: "https://placehold.co/200x200/f5f5f5/333?text=Novo", name: "Novo Produto", price: "R$ 0,00", link: "#" }]);
          }}><Plus className="w-3 h-3" /> Adicionar Produto</Button>
        </div>
      )}

      {block.type === "testimonial" && (
        <>
          <div className="space-y-1"><Label className="text-xs">Citação</Label><Textarea value={block.content.quote} onChange={(e) => updateContent("quote", e.target.value)} className="text-xs min-h-[80px]" /></div>
          <div className="space-y-1"><Label className="text-xs">Autor</Label><Input value={block.content.author} onChange={(e) => updateContent("author", e.target.value)} className="h-8 text-xs" /></div>
          <div className="space-y-1"><Label className="text-xs">Cargo/Info</Label><Input value={block.content.role} onChange={(e) => updateContent("role", e.target.value)} className="h-8 text-xs" /></div>
        </>
      )}

      {block.type === "columns" && (
        <div className="space-y-3">
          {(block.content.columns || []).map((col: any, i: number) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Coluna {i + 1}</span>
                {block.content.columns.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    const columns = [...block.content.columns];
                    columns.splice(i, 1);
                    updateContent("columns", columns);
                  }}><Trash2 className="w-3 h-3" /></Button>
                )}
              </div>
              <Input value={col.title} onChange={(e) => { const columns = [...block.content.columns]; columns[i] = { ...col, title: e.target.value }; updateContent("columns", columns); }} placeholder="Título" className="h-7 text-xs" />
              <Textarea value={col.text} onChange={(e) => { const columns = [...block.content.columns]; columns[i] = { ...col, text: e.target.value }; updateContent("columns", columns); }} placeholder="Texto" className="text-xs min-h-[60px]" />
            </div>
          ))}
          {block.content.columns.length < 4 && (
            <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => {
              updateContent("columns", [...block.content.columns, { title: "Nova Coluna", text: "Conteúdo aqui." }]);
            }}><Plus className="w-3 h-3" /> Adicionar Coluna</Button>
          )}
        </div>
      )}

      {block.type === "footer" && (
        <>
          <div className="space-y-1"><Label className="text-xs">Texto</Label><Textarea value={block.content.text} onChange={(e) => updateContent("text", e.target.value)} className="text-xs min-h-[60px]" /></div>
          <div className="space-y-1"><Label className="text-xs">Texto do unsub</Label><Input value={block.content.unsubscribeText} onChange={(e) => updateContent("unsubscribeText", e.target.value)} className="h-8 text-xs" /></div>
        </>
      )}

      {/* Style fields */}
      <div className="pt-3 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Estilos</p>
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(block.styles).map(([key, value]) => (
            <StyleField key={key} label={STYLE_LABELS[key] || key} value={value} onChange={(v) => updateStyle(key, v)} />
          ))}
        </div>
      </div>
    </div>
  );
}
