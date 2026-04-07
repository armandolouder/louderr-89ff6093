import { useState } from "react";
import { useEmailBuilder } from "./useEmailBuilder";
import { BlockPalette } from "./BlockPalette";
import { BlockCanvas } from "./BlockCanvas";
import { BlockEditor } from "./BlockEditor";
import { exportToHtml } from "./htmlExporter";
import { BlockType, EmailBlock } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
// ScrollArea used for block editor panel
import { ArrowLeft, Eye, Save, Code, Palette } from "lucide-react";

interface EmailBuilderProps {
  initialHtml?: string;
  initialBlocks?: EmailBlock[];
  onSave: (html: string, blocks: EmailBlock[]) => void;
  onCancel: () => void;
  templateName?: string;
  templateSubject?: string;
}

export function EmailBuilder({ initialBlocks, onSave, onCancel, templateName = "", templateSubject = "" }: EmailBuilderProps) {
  const { state, selectedBlock, addBlock, updateBlock, removeBlock, moveBlock, duplicateBlock, selectBlock, setGlobalStyles } = useEmailBuilder(initialBlocks);
  const [showPreview, setShowPreview] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showGlobalStyles, setShowGlobalStyles] = useState(false);
  const [name, setName] = useState(templateName);
  const [subject, setSubject] = useState(templateSubject);

  const html = exportToHtml(state);
  const previewHtml = html
    .replace(/\{\{nome\}\}/gi, "Maria")
    .replace(/\{\{email\}\}/gi, "maria@email.com")
    .replace(/\{\{unsubscribe_url\}\}/gi, "#")
    .replace(/\{\{recovery_url\}\}/gi, "https://loja.com/checkout/exemplo")
    .replace(/\{\{total\}\}/gi, "R$ 379,80")
    .replace(/\{\{produtos\}\}/gi, '<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td width="50%" style="padding:4px;vertical-align:top;"><div style="background:#f5f5f5;height:120px;text-align:center;line-height:120px;font-size:11px;color:#999;">Produto 1</div></td><td width="50%" style="padding:4px;vertical-align:top;"><div style="background:#f5f5f5;height:120px;text-align:center;line-height:120px;font-size:11px;color:#999;">Produto 2</div></td></tr></table>');

  const handleSave = () => {
    onSave(html, state.blocks);
  };

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-2.5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="hidden md:flex items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do template" className="h-8 w-40 text-xs" />
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email" className="h-8 w-48 text-xs" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setShowGlobalStyles(true)} className="gap-1.5">
            <Palette className="w-4 h-4" /> <span className="hidden sm:inline">Estilos</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCode(true)} className="gap-1.5">
            <Code className="w-4 h-4" /> <span className="hidden sm:inline">HTML</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} className="gap-1.5">
            <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name || !subject} className="gap-1.5">
            <Save className="w-4 h-4" /> Salvar
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left palette */}
        <div className="w-44 border-r border-border bg-card/50 p-3 overflow-auto hidden md:block">
          <BlockPalette onAdd={addBlock} onDragStart={() => {}} />
        </div>

        {/* Canvas */}
        <BlockCanvas
          blocks={state.blocks}
          selectedBlockId={state.selectedBlockId}
          onSelect={selectBlock}
          onRemove={removeBlock}
          onDuplicate={duplicateBlock}
          onMove={moveBlock}
          onDropNewBlock={(type: BlockType, index: number) => addBlock(type, index)}
        />

        {/* Right editor */}
        {selectedBlock && (
          <div className="w-72 border-l border-border bg-card/50 overflow-auto">
            <ScrollArea className="h-full">
              <div className="p-4">
                <BlockEditor block={selectedBlock} onChange={(u) => updateBlock(selectedBlock.id, u)} />
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Mobile palette */}
      <div className="md:hidden border-t border-border p-2 bg-card/80 overflow-x-auto">
        <BlockPalette onAdd={addBlock} onDragStart={() => {}} />
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader><DialogTitle>Preview do Email</DialogTitle></DialogHeader>
          <div className="border rounded-lg overflow-auto max-h-[70vh]">
            <iframe srcDoc={previewHtml} className="w-full min-h-[500px] border-0" title="Preview" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Code Dialog */}
      <Dialog open={showCode} onOpenChange={setShowCode}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader><DialogTitle>Código HTML</DialogTitle></DialogHeader>
          <div className="border rounded-lg overflow-auto max-h-[70vh]">
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap text-muted-foreground">{html}</pre>
          </div>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(html); }}>Copiar HTML</Button>
        </DialogContent>
      </Dialog>

      {/* Global Styles Dialog */}
      <Dialog open={showGlobalStyles} onOpenChange={setShowGlobalStyles}>
        <DialogContent>
          <DialogHeader><DialogTitle>Estilos Globais</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Cor de fundo</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={state.globalStyles.backgroundColor} onChange={(e) => setGlobalStyles({ backgroundColor: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" />
                <Input value={state.globalStyles.backgroundColor} onChange={(e) => setGlobalStyles({ backgroundColor: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Largura do conteúdo (px)</Label>
              <Input value={state.globalStyles.contentWidth} onChange={(e) => setGlobalStyles({ contentWidth: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fonte</Label>
              <Input value={state.globalStyles.fontFamily} onChange={(e) => setGlobalStyles({ fontFamily: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Borda arredondada</Label>
              <Input value={state.globalStyles.borderRadius} onChange={(e) => setGlobalStyles({ borderRadius: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
