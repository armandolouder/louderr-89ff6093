import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import type { JourneyNodeData } from "@/stores/journeyStore";

const TRIGGERS = [
  { value: "visit", label: "Visita ao site" },
  { value: "cart", label: "Add ao carrinho" },
  { value: "purchase", label: "Compra realizada" },
  { value: "shipped", label: "Pedido enviado" },
  { value: "delivered", label: "Pedido entregue" },
];

interface Props {
  nodeId: string;
  data: JourneyNodeData;
  onUpdate: (id: string, data: Partial<JourneyNodeData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function JourneyNodeProperties({ nodeId, data, onUpdate, onDelete, onClose }: Props) {
  const nodeType = data.type;

  return (
    <div className="w-72 border-l border-border bg-card/50 p-4 space-y-4 flex-shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Propriedades</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Nome</Label>
          <Input
            value={data.label || ""}
            onChange={(e) => onUpdate(nodeId, { label: e.target.value })}
            className="h-8 text-sm"
          />
        </div>

        {nodeType === "trigger" && (
          <div>
            <Label className="text-xs">Evento</Label>
            <Select
              value={data.triggerEvent || "visit"}
              onValueChange={(v) => onUpdate(nodeId, { triggerEvent: v })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {nodeType === "message" && (
          <>
            <div>
              <Label className="text-xs">Canal</Label>
              <Select
                value={data.channel || "email"}
                onValueChange={(v) => onUpdate(nodeId, { channel: v as any })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="both">Email + WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Conteúdo da mensagem</Label>
              <Textarea
                value={data.messageContent || ""}
                onChange={(e) => onUpdate(nodeId, { messageContent: e.target.value })}
                rows={4}
                className="text-sm"
                placeholder="Olá {{nome}}, temos novidades..."
              />
            </div>
          </>
        )}

        {nodeType === "delay" && (
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Tempo</Label>
              <Input
                type="number"
                min={1}
                value={data.delayValue || 1}
                onChange={(e) => onUpdate(nodeId, { delayValue: Number(e.target.value) })}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Unidade</Label>
              <Select
                value={data.delayUnit || "hours"}
                onValueChange={(v) => onUpdate(nodeId, { delayUnit: v as any })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <Button variant="destructive" size="sm" className="w-full mt-4" onClick={() => onDelete(nodeId)}>
        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
        Excluir nó
      </Button>
    </div>
  );
}
