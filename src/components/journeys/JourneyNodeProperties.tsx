import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, X, Mail, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { JourneyNodeData } from "@/stores/journeyStore";

const TRIGGERS = [
  { value: "visit", label: "Visita ao site" },
  { value: "cart", label: "Carrinho abandonado" },
  { value: "purchase", label: "Compra realizada" },
  { value: "payment_pending", label: "Pagamento pendente (Boleto/Pix)" },
  { value: "payment_confirmed", label: "Pagamento confirmado" },
  { value: "packed", label: "Pedido embalado" },
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

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string | null;
}

interface WaTemplate {
  id: string;
  name: string;
  message_content: string | null;
  media_url: string | null;
  trigger_event: string;
}

export function JourneyNodeProperties({ nodeId, data, onUpdate, onDelete, onClose }: Props) {
  const nodeType = data.type;
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [waTemplates, setWaTemplates] = useState<WaTemplate[]>([]);

  useEffect(() => {
    if (nodeType !== "message") return;

    supabase.from("email_templates").select("id, name, subject, category").eq("is_active", true)
      .order("name").then(({ data: d }) => { if (d) setEmailTemplates(d); });

    supabase.from("automation_flows").select("id, name, message_content, media_url, trigger_event")
      .order("name").then(({ data: d }) => { if (d) setWaTemplates(d); });
  }, [nodeType]);

  const showEmailPicker = nodeType === "message" && (data.channel === "email" || data.channel === "both");
  const showWaPicker = nodeType === "message" && (data.channel === "whatsapp" || data.channel === "both");

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

            {showEmailPicker && (
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-blue-500" />
                  Template de Email
                </Label>
                {emailTemplates.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground mt-1">Nenhum template encontrado. Crie um no Email Marketing.</p>
                ) : (
                  <Select
                    value={data.templateId || ""}
                    onValueChange={(v) => {
                      const tpl = emailTemplates.find((t) => t.id === v);
                      onUpdate(nodeId, { templateId: v, templateName: tpl?.name || "" });
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecionar template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{t.name}</span>
                            {t.category && (
                              <Badge variant="outline" className="text-[9px] ml-1">{t.category}</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {data.templateName && (
                  <p className="text-[10px] text-muted-foreground mt-1">Selecionado: {data.templateName}</p>
                )}
              </div>
            )}

            {showWaPicker && (
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-green-500" />
                  Mensagem WhatsApp
                </Label>
                {waTemplates.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground mt-1">Nenhuma automação encontrada. Crie uma em Automações.</p>
                ) : (
                  <Select
                    value={data.waTemplateId || ""}
                    onValueChange={(v) => {
                      const tpl = waTemplates.find((t) => t.id === v);
                      onUpdate(nodeId, {
                        waTemplateId: v,
                        messageContent: tpl?.message_content?.substring(0, 80) || "",
                        templateName: tpl?.name || "",
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecionar automação..." />
                    </SelectTrigger>
                    <SelectContent>
                      {waTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="truncate text-xs">{t.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {data.messageContent && (
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{data.messageContent}</p>
                )}
              </div>
            )}
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
