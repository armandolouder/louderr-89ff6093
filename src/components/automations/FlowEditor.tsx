import { useState, useEffect } from "react";
import { ArrowLeft, Save, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AutomationFlow,
  TRIGGER_EVENTS,
  AVAILABLE_VARIABLES,
  useSaveAutomationFlow,
} from "@/hooks/useAutomationFlows";
import { toast } from "sonner";

interface FlowEditorProps {
  flow?: AutomationFlow | null;
  onBack: () => void;
}

export function FlowEditor({ flow, onBack }: FlowEditorProps) {
  const [name, setName] = useState(flow?.name || "");
  const [status, setStatus] = useState(flow?.status || "active");
  const [triggerEvent, setTriggerEvent] = useState(flow?.trigger_event || "order/created");
  const [delayValue, setDelayValue] = useState(flow?.delay_value || 1);
  const [delayUnit, setDelayUnit] = useState(flow?.delay_unit || "minutes");
  const [messageContent, setMessageContent] = useState(flow?.message_content || "");
  const [mediaUrl, setMediaUrl] = useState(flow?.media_url || "");

  const saveFlow = useSaveAutomationFlow();

  useEffect(() => {
    if (flow) {
      setName(flow.name);
      setStatus(flow.status);
      setTriggerEvent(flow.trigger_event);
      setDelayValue(flow.delay_value);
      setDelayUnit(flow.delay_unit);
      setMessageContent(flow.message_content);
      setMediaUrl(flow.media_url || "");
    }
  }, [flow]);

  const insertVariable = (variable: string) => {
    setMessageContent((prev) => prev + variable);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome do fluxo é obrigatório");
      return;
    }
    if (!messageContent.trim()) {
      toast.error("Conteúdo da mensagem é obrigatório");
      return;
    }

    try {
      await saveFlow.mutateAsync({
        id: flow?.id,
        name,
        status,
        trigger_event: triggerEvent,
        delay_value: delayValue,
        delay_unit: delayUnit,
        message_content: messageContent,
        media_url: mediaUrl || null,
        media_type: mediaUrl ? "image" : null,
      });
      toast.success(flow ? "Fluxo atualizado!" : "Fluxo criado!");
      onBack();
    } catch {
      toast.error("Erro ao salvar fluxo");
    }
  };

  const triggerLabel = TRIGGER_EVENTS.find((t) => t.value === triggerEvent)?.label || triggerEvent;

  // Build preview text replacing variables
  const previewText = messageContent
    .replace(/\[nome_cliente\]/g, "João")
    .replace(/\[numero_pedido\]/g, "#1234")
    .replace(/\[total_pedido\]/g, "R$ 189,90")
    .replace(/\[link_pagamento\]/g, "https://pay.example.com/abc")
    .replace(/\[link_boleto\]/g, "https://boleto.example.com/xyz")
    .replace(/\[url_sucesso_pedido\]/g, "https://loja.example.com/checkout/v3/success/123/token123")
    .replace(/\[url_sucesso\]/g, "https://loja.example.com/checkout/v3/success/123/token123")
    .replace(/\[lista_produtos\]/g, "1x Camiseta LOUDER\n1x Boné LOUDER")
    .replace(/\[codigo_rastreio\]/g, "AB123456789BR");

  const delayLabel = `${delayValue} ${delayUnit === "minutes" ? "minutos" : delayUnit === "hours" ? "horas" : "dias"}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">
              {flow ? "Editar Fluxo" : "Novo Fluxo"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure o disparo automático
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saveFlow.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar Fluxo
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex gap-6 p-6 max-w-screen-xl mx-auto">
          {/* Left: Form */}
          <div className="flex-1 space-y-6">
            {/* Name & Status */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Fluxo</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Pedido Enviado"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gatilho (Evento)</Label>
                  <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_EVENTS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Evento que inicia esta automação.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>⏱ Agendamento (Timer)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={delayValue}
                      onChange={(e) => setDelayValue(parseInt(e.target.value) || 0)}
                      className="flex-1"
                    />
                    <Select value={delayUnit} onValueChange={setDelayUnit}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutos</SelectItem>
                        <SelectItem value="hours">Horas</SelectItem>
                        <SelectItem value="days">Dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enviar {delayLabel} após o evento ocorrer.
                  </p>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Conteúdo da Mensagem</h3>
                {mediaUrl ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMediaUrl("")}
                    className="gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Remover Mídia
                  </Button>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs">URL da Mídia (opcional)</Label>
                    <Input
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-64"
                    />
                  </div>
                )}
              </div>

              {mediaUrl && (
                <div className="w-40 h-24 rounded-lg overflow-hidden border border-border">
                  <img
                    src={mediaUrl}
                    alt="Mídia"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Variable chips */}
              <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                {AVAILABLE_VARIABLES.map((v) => (
                  <Badge
                    key={v.key}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => insertVariable(v.key)}
                  >
                    {v.label}
                  </Badge>
                ))}
              </div>

              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Digite o conteúdo da mensagem automática..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </div>

          {/* Right: Preview */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-6 space-y-3">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Pré-visualização</p>
                <Badge variant="outline" className="text-xs">
                  ⏱ Envia após {delayLabel}
                </Badge>
              </div>

              {/* Phone mockup */}
              <div className="bg-[#0b141a] rounded-2xl p-3 shadow-xl border border-border">
                {/* WhatsApp header */}
                <div className="flex items-center gap-3 pb-3 border-b border-border/20">
                  <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                    L
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">LOUDER.ink</p>
                    <p className="text-xs text-muted-foreground">Business Account</p>
                  </div>
                </div>

                {/* Message bubble */}
                <div className="mt-3 space-y-2">
                  {mediaUrl && (
                    <div className="rounded-lg overflow-hidden">
                      <img
                        src={mediaUrl}
                        alt="Mídia preview"
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div className="bg-[#005c4b] rounded-lg p-3">
                    <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                      {previewText || "Escreva o conteúdo da mensagem..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
