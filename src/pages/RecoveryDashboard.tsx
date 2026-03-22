import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingCart, TrendingUp, DollarSign, BarChart3, Plus, Play, Pause,
  Trash2, Settings2, MessageSquare, Mail, Clock, Zap, Target,
  ArrowRight, CheckCircle, XCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplatePreview } from "@/components/recovery/EmailTemplatePreview";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface RecoveryStep {
  step: number;
  delay_minutes: number;
  channel: "whatsapp" | "email";
  message_type: string;
  message_template: string;
  ab_enabled: boolean;
}

const DEFAULT_STEPS: RecoveryStep[] = [
  { step: 1, delay_minutes: 15, channel: "whatsapp", message_type: "leve", message_template: "Oi [nome_cliente]! 👋 Vi que você deixou uns itens incríveis no carrinho:\n\n[lista_produtos]\n\nTotal: [total_pedido]\n\nQuer finalizar? [link_recuperacao]", ab_enabled: false },
  { step: 2, delay_minutes: 120, channel: "email", message_type: "emocional", message_template: "", ab_enabled: false },
  { step: 3, delay_minutes: 1440, channel: "whatsapp", message_type: "urgencia", message_template: "⚡ [nome_cliente], seus itens estão quase esgotando!\n\n[lista_produtos]\n\nGaranta agora: [link_recuperacao]", ab_enabled: true },
  { step: 4, delay_minutes: 2880, channel: "email", message_type: "incentivo", message_template: "", ab_enabled: true },
  { step: 5, delay_minutes: 4320, channel: "whatsapp", message_type: "ultima_chamada", message_template: "⏰ Última chance, [nome_cliente]! Seu carrinho será limpo em breve.\n\n[lista_produtos]\n\nFinalizar: [link_recuperacao]", ab_enabled: false },
];

export default function RecoveryDashboard() {
  const queryClient = useQueryClient();
  const [showFlowEditor, setShowFlowEditor] = useState(false);
  const [editingFlow, setEditingFlow] = useState<any>(null);
  const [flowName, setFlowName] = useState("");
  const [flowDescription, setFlowDescription] = useState("");
  const [flowSteps, setFlowSteps] = useState<RecoveryStep[]>(DEFAULT_STEPS);
  const [tab, setTab] = useState("dashboard");

  // Queries
  const { data: checkouts } = useQuery({
    queryKey: ["recovery-checkouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nuvemshop_abandoned_checkouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: executions } = useQuery({
    queryKey: ["recovery-executions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recovery_executions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["recovery-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recovery_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: flows } = useQuery({
    queryKey: ["recovery-flows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recovery_flows")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Metrics
  const metrics = useMemo(() => {
    const list = checkouts || [];
    const totalAbandoned = list.reduce((s, c) => s + (c.total || 0), 0);
    const recovered = list.filter(c => c.recovered);
    const totalRecovered = recovered.reduce((s, c) => s + (c.total || 0), 0);
    const recoveryRate = list.length > 0 ? ((recovered.length / list.length) * 100) : 0;
    const contacted = list.filter(c => c.contacted_at).length;

    const msgs = messages || [];
    const sentMsgs = msgs.filter(m => m.status === "sent");
    const clickedMsgs = msgs.filter(m => m.clicked_at);
    const clickRate = sentMsgs.length > 0 ? ((clickedMsgs.length / sentMsgs.length) * 100) : 0;

    const whatsappMsgs = sentMsgs.filter(m => m.channel === "whatsapp").length;
    const emailMsgs = sentMsgs.filter(m => m.channel === "email").length;
    const bestChannel = whatsappMsgs > emailMsgs ? "WhatsApp" : emailMsgs > 0 ? "Email" : "N/A";

    // A/B stats
    const variantA = msgs.filter(m => m.variant === "A" && m.status === "sent");
    const variantB = msgs.filter(m => m.variant === "B" && m.status === "sent");
    const clickA = variantA.filter(m => m.clicked_at).length;
    const clickB = variantB.filter(m => m.clicked_at).length;
    const rateA = variantA.length > 0 ? (clickA / variantA.length * 100) : 0;
    const rateB = variantB.length > 0 ? (clickB / variantB.length * 100) : 0;

    return {
      totalAbandoned, totalRecovered, recoveryRate: recoveryRate.toFixed(1),
      totalCheckouts: list.length, recoveredCount: recovered.length, contacted,
      clickRate: clickRate.toFixed(1), bestChannel,
      sentMsgs: sentMsgs.length, whatsappMsgs, emailMsgs,
      rateA: rateA.toFixed(1), rateB: rateB.toFixed(1),
      variantACount: variantA.length, variantBCount: variantB.length,
    };
  }, [checkouts, messages]);

  // Funnel data
  const funnel = useMemo(() => {
    const total = checkouts?.length || 0;
    const contacted = checkouts?.filter(c => c.contacted_at).length || 0;
    const clicked = checkouts?.filter(c => c.clicked_at).length || 0;
    const recovered = checkouts?.filter(c => c.recovered).length || 0;
    return [
      { label: "Carrinhos", value: total, color: "bg-destructive" },
      { label: "Contatados", value: contacted, color: "bg-amber-500" },
      { label: "Cliques", value: clicked, color: "bg-blue-500" },
      { label: "Compras", value: recovered, color: "bg-emerald-500" },
    ];
  }, [checkouts]);

  // Save flow
  const saveFlow = useMutation({
    mutationFn: async () => {
      const payload = {
        name: flowName,
        description: flowDescription,
        steps: JSON.parse(JSON.stringify(flowSteps)),
        is_active: true,
      };

      if (editingFlow) {
        const { error } = await supabase
          .from("recovery_flows")
          .update(payload)
          .eq("id", editingFlow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("recovery_flows")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Fluxo salvo!");
      setShowFlowEditor(false);
      queryClient.invalidateQueries({ queryKey: ["recovery-flows"] });
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const toggleFlow = async (flow: any) => {
    const { error } = await supabase
      .from("recovery_flows")
      .update({ is_active: !flow.is_active })
      .eq("id", flow.id);
    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      toast.success(flow.is_active ? "Fluxo pausado" : "Fluxo ativado");
      queryClient.invalidateQueries({ queryKey: ["recovery-flows"] });
    }
  };

  const deleteFlow = async (id: string) => {
    const { error } = await supabase.from("recovery_flows").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Fluxo excluído");
      queryClient.invalidateQueries({ queryKey: ["recovery-flows"] });
    }
  };

  const openNewFlow = () => {
    setEditingFlow(null);
    setFlowName("Fluxo de Recuperação Padrão");
    setFlowDescription("Sequência automática de 5 etapas com WhatsApp + Email");
    setFlowSteps(DEFAULT_STEPS);
    setShowFlowEditor(true);
  };

  const openEditFlow = (flow: any) => {
    setEditingFlow(flow);
    setFlowName(flow.name);
    setFlowDescription(flow.description || "");
    setFlowSteps(flow.steps || DEFAULT_STEPS);
    setShowFlowEditor(true);
  };

  const updateStep = (index: number, field: string, value: any) => {
    setFlowSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addStep = () => {
    setFlowSteps(prev => [
      ...prev,
      {
        step: prev.length + 1,
        delay_minutes: 60,
        channel: "whatsapp" as const,
        message_type: "leve",
        message_template: "",
        ab_enabled: false,
      },
    ]);
  };

  const removeStep = (index: number) => {
    setFlowSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step: i + 1 })));
  };

  const formatDelay = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recovery Engine</h1>
            <p className="text-sm text-muted-foreground">Motor inteligente de recuperação de carrinhos</p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="flows">Fluxos</TabsTrigger>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* === DASHBOARD TAB === */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Abandonado</p>
                    <p className="text-xl font-bold text-destructive">{formatCurrency(metrics.totalAbandoned)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Recuperado</p>
                    <p className="text-xl font-bold text-emerald-500">{formatCurrency(metrics.totalRecovered)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Target className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa de Recuperação</p>
                    <p className="text-xl font-bold text-foreground">{metrics.recoveryRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Melhor Canal</p>
                    <p className="text-xl font-bold text-foreground">{metrics.bestChannel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil de Recuperação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {funnel.map((stage, i) => (
                  <div key={stage.label} className="flex items-center gap-2 flex-1">
                    <div className="flex-1 text-center">
                      <div className={`${stage.color} rounded-lg py-4 px-2`}>
                        <p className="text-2xl font-bold text-white">{stage.value}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{stage.label}</p>
                    </div>
                    {i < funnel.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* A/B Results + Channel Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Teste A/B</CardTitle>
                <CardDescription>Performance das variantes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">A</Badge>
                    <span className="text-sm">Padrão</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{metrics.rateA}% cliques</p>
                    <p className="text-xs text-muted-foreground">{metrics.variantACount} envios</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary">B</Badge>
                    <span className="text-sm">IA</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{metrics.rateB}% cliques</p>
                    <p className="text-xs text-muted-foreground">{metrics.variantBCount} envios</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Canais</CardTitle>
                <CardDescription>Mensagens enviadas por canal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm">WhatsApp</span>
                  </div>
                  <span className="text-sm font-bold">{metrics.whatsappMsgs}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Email (Brevo)</span>
                  </div>
                  <span className="text-sm font-bold">{metrics.emailMsgs}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === FLOWS TAB === */}
        <TabsContent value="flows" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fluxos de Recuperação</h2>
            <Button onClick={openNewFlow} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Novo Fluxo
            </Button>
          </div>

          {!flows?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum fluxo criado ainda.</p>
                <Button onClick={openNewFlow} className="mt-4">
                  <Plus className="w-4 h-4 mr-1" /> Criar Primeiro Fluxo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {flows.map((flow: any) => {
                const steps = (flow.steps || []) as RecoveryStep[];
                return (
                  <Card key={flow.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${flow.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                          <div>
                            <p className="font-medium">{flow.name}</p>
                            <p className="text-xs text-muted-foreground">{flow.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{steps.length} etapas</Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFlow(flow)}>
                            {flow.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditFlow(flow)}>
                            <Settings2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteFlow(flow.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Visual flow */}
                      <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-destructive/20 rounded text-xs text-destructive font-medium shrink-0">
                          <ShoppingCart className="w-3 h-3" /> Abandono
                        </div>
                        {steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-1 shrink-0">
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <div className="text-[10px] text-muted-foreground">{formatDelay(step.delay_minutes)}</div>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                              step.channel === "whatsapp" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
                            }`}>
                              {step.channel === "whatsapp" ? <MessageSquare className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                              {step.message_type}
                              {step.ab_enabled && <span className="ml-1 text-[9px] bg-primary/30 rounded px-1">A/B</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* === MESSAGES TAB === */}
        <TabsContent value="messages" className="space-y-4 mt-4">
          <h2 className="text-lg font-semibold">Mensagens Enviadas</h2>
          <div className="space-y-2">
            {!messages?.length ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma mensagem de recuperação enviada ainda.
                </CardContent>
              </Card>
            ) : (
              messages.slice(0, 50).map((msg: any) => (
                <div key={msg.id} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                  <div className="flex items-center gap-3">
                    {msg.channel === "whatsapp" ? (
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Mail className="w-4 h-4 text-blue-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        Etapa {msg.step_number + 1} • {msg.channel}
                        {msg.variant === "B" && <Badge className="ml-2 text-[10px] bg-primary/20 text-primary">IA</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {msg.content || msg.subject || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={msg.status === "sent" ? "secondary" : msg.status === "failed" ? "destructive" : "outline"} className="text-xs">
                      {msg.status}
                    </Badge>
                    {msg.clicked_at && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    <span className="text-xs text-muted-foreground">
                      {msg.sent_at ? new Date(msg.sent_at).toLocaleString("pt-BR") : "—"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* === FLOW EDITOR DIALOG === */}
      <Dialog open={showFlowEditor} onOpenChange={setShowFlowEditor}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFlow ? "Editar Fluxo" : "Novo Fluxo de Recuperação"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={flowName} onChange={e => setFlowName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={flowDescription} onChange={e => setFlowDescription(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Etapas do Fluxo</Label>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="w-3 h-3 mr-1" /> Etapa
                </Button>
              </div>

              {flowSteps.map((step, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Etapa {i + 1}</Badge>
                      {step.channel === "whatsapp" ? (
                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Mail className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    {flowSteps.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStep(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Delay (minutos)</Label>
                      <Input
                        type="number"
                        value={step.delay_minutes}
                        onChange={e => updateStep(i, "delay_minutes", parseInt(e.target.value) || 0)}
                      />
                      <p className="text-[10px] text-muted-foreground">{formatDelay(step.delay_minutes)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Canal</Label>
                      <Select value={step.channel} onValueChange={v => updateStep(i, "channel", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="email">Email (Brevo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={step.message_type} onValueChange={v => updateStep(i, "message_type", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leve">Leve</SelectItem>
                          <SelectItem value="emocional">Emocional</SelectItem>
                          <SelectItem value="urgencia">Urgência</SelectItem>
                          <SelectItem value="incentivo">Incentivo</SelectItem>
                          <SelectItem value="ultima_chamada">Última Chamada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {step.channel === "whatsapp" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Mensagem WhatsApp</Label>
                      <Textarea
                        value={step.message_template}
                        onChange={e => updateStep(i, "message_template", e.target.value)}
                        placeholder="Use [nome_cliente], [lista_produtos], [total_pedido], [link_recuperacao]"
                        rows={3}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={step.ab_enabled}
                      onCheckedChange={v => updateStep(i, "ab_enabled", v)}
                    />
                    <Label className="text-xs">Teste A/B (variante B gerada por IA)</Label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlowEditor(false)}>Cancelar</Button>
            <Button onClick={() => saveFlow.mutate()} disabled={saveFlow.isPending}>
              {saveFlow.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar Fluxo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
