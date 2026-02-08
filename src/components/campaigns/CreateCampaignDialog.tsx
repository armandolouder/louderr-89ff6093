import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Loader2, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Clock, 
  Users,
  MessageSquare,
  Send,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Cluster {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  objective: string | null;
  recommendation: string | null;
  customer_count: number;
  color: string;
}

interface GeneratedMessage {
  content: string;
  variant: string;
}

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCampaignDialog({ open, onOpenChange }: CreateCampaignDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<number[]>([0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [delayMin, setDelayMin] = useState(180);
  const [delayMax, setDelayMax] = useState(480);
  const [scheduleType, setScheduleType] = useState<"now" | "scheduled">("now");
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("09:00");

  const { data: clusters } = useQuery({
    queryKey: ["customer-clusters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_clusters")
        .select("*")
        .gt("customer_count", 0)
        .order("customer_count", { ascending: false });
      if (error) throw error;
      return data as Cluster[];
    },
  });

  const totalRecipients = clusters
    ?.filter((c) => selectedClusters.includes(c.id))
    .reduce((sum, c) => sum + c.customer_count, 0) || 0;

  const selectedClusterData = clusters?.find((c) => selectedClusters.includes(c.id));

  const generateMessages = async () => {
    if (!selectedClusterData) {
      toast.error("Selecione pelo menos um cluster");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-messages", {
        body: {
          clusterName: selectedClusterData.name,
          clusterDescription: selectedClusterData.description,
          objective: selectedClusterData.objective,
          recommendation: selectedClusterData.recommendation,
          messageCount: 3,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMessages(data.messages || []);
      setSelectedMessages([0]);
      toast.success("Mensagens geradas com sucesso!");
    } catch (error) {
      console.error("Error generating messages:", error);
      toast.error("Erro ao gerar mensagens. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      // Calculate scheduled_at if needed
      let scheduled_at: string | null = null;
      if (scheduleType === "scheduled" && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(":").map(Number);
        const dateTime = new Date(scheduledDate);
        dateTime.setHours(hours, minutes, 0, 0);
        scheduled_at = dateTime.toISOString();
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name,
          description: description || null,
          cluster_ids: selectedClusters,
          status: scheduleType === "now" ? "running" : "scheduled",
          channel: "whatsapp",
          daily_limit: dailyLimit,
          delay_min_seconds: delayMin,
          delay_max_seconds: delayMax,
          total_recipients: totalRecipients,
          scheduled_at,
          started_at: scheduleType === "now" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Save campaign messages
      const selectedMsgs = selectedMessages.map((idx) => messages[idx]);
      const { error: msgError } = await supabase.from("campaign_messages").insert(
        selectedMsgs.map((msg) => ({
          campaign_id: campaign.id,
          content: msg.content,
          message_type: "text",
        }))
      );

      if (msgError) throw msgError;

      // Fetch customers from selected clusters and create queue entries
      const { data: customers, error: customersError } = await supabase
        .from("imported_customers")
        .select("id, name, phone, cluster_id")
        .in("cluster_id", selectedClusters)
        .eq("phone_status", "valid")
        .not("phone", "is", null);

      if (customersError) throw customersError;

      // Create queue entries with random message assignment
      if (customers && customers.length > 0) {
        const queueEntries = customers.map((customer) => {
          const randomMsgIdx = Math.floor(Math.random() * selectedMsgs.length);
          const message = selectedMsgs[randomMsgIdx];
          const personalizedContent = message.content.replace(/\{\{nome\}\}/gi, customer.name.split(" ")[0]);

          return {
            campaign_id: campaign.id,
            customer_id: customer.id,
            phone: customer.phone!,
            content: personalizedContent,
            status: "pending",
          };
        });

        // Insert in batches
        const batchSize = 500;
        for (let i = 0; i < queueEntries.length; i += batchSize) {
          const batch = queueEntries.slice(i, i + batchSize);
          const { error: queueError } = await supabase.from("whatsapp_queue").insert(batch);
          if (queueError) throw queueError;
        }

        // Update campaign total
        await supabase
          .from("campaigns")
          .update({ total_recipients: queueEntries.length })
          .eq("id", campaign.id);
      }

      return campaign;
    },
    onSuccess: () => {
      toast.success("Campanha criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating campaign:", error);
      toast.error("Erro ao criar campanha. Tente novamente.");
    },
  });

  const resetForm = () => {
    setStep(1);
    setName("");
    setDescription("");
    setSelectedClusters([]);
    setMessages([]);
    setSelectedMessages([0]);
    setDailyLimit(50);
    setDelayMin(180);
    setDelayMax(480);
    setScheduleType("now");
    setScheduledDate(undefined);
    setScheduledTime("09:00");
  };

  const toggleCluster = (clusterId: string) => {
    setSelectedClusters((prev) =>
      prev.includes(clusterId)
        ? prev.filter((id) => id !== clusterId)
        : [...prev, clusterId]
    );
  };

  const toggleMessage = (idx: number) => {
    setSelectedMessages((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim().length > 0 && selectedClusters.length > 0;
      case 2:
        return messages.length > 0 && selectedMessages.length > 0;
      case 3:
        return scheduleType === "now" || (scheduledDate !== undefined);
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Nova Campanha</DialogTitle>
          <DialogDescription>
            {step === 1 && "Defina o nome e selecione os segmentos de clientes"}
            {step === 2 && "Gere mensagens com IA e escolha as variações"}
            {step === 3 && "Configure o envio e agendamento"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "w-12 h-1 rounded",
                    step > s ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Clusters */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da campanha</Label>
                <Input
                  id="name"
                  placeholder="Ex: Promoção de Verão"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o objetivo da campanha..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Selecione os segmentos</Label>
                <div className="grid gap-2">
                  {clusters?.map((cluster) => (
                    <div
                      key={cluster.id}
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                        selectedClusters.includes(cluster.id)
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => toggleCluster(cluster.id)}
                    >
                      <Checkbox
                        checked={selectedClusters.includes(cluster.id)}
                        onCheckedChange={() => toggleCluster(cluster.id)}
                      />
                      <span className="text-xl">{cluster.emoji || "📊"}</span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{cluster.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {cluster.description}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        <Users className="w-3 h-3 mr-1" />
                        {cluster.customer_count}
                      </Badge>
                    </div>
                  ))}
                </div>

                {selectedClusters.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Total: <span className="font-medium text-foreground">{totalRecipients}</span> destinatários
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Messages */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Mensagens da campanha</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateMessages}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {messages.length > 0 ? "Regenerar" : "Gerar com IA"}
                    </>
                  )}
                </Button>
              </div>

              {messages.length === 0 && !isGenerating && (
                <div className="text-center py-8 border rounded-lg bg-muted/50">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-3">
                    Clique em "Gerar com IA" para criar mensagens personalizadas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Baseado no perfil: <span className="font-medium">{selectedClusterData?.name}</span>
                  </p>
                </div>
              )}

              {messages.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Selecione as mensagens que deseja usar (serão enviadas aleatoriamente):
                  </p>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-colors",
                        selectedMessages.includes(idx)
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => toggleMessage(idx)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedMessages.includes(idx)}
                          onCheckedChange={() => toggleMessage(idx)}
                        />
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-2">
                            Variante {msg.variant}
                          </Badge>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Schedule */}
              <div className="space-y-3">
                <Label>Quando enviar</Label>
                <Tabs value={scheduleType} onValueChange={(v) => setScheduleType(v as "now" | "scheduled")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="now">
                      <Send className="w-4 h-4 mr-2" />
                      Enviar agora
                    </TabsTrigger>
                    <TabsTrigger value="scheduled">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      Agendar
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="scheduled" className="space-y-3 pt-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Data</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1",
                                !scheduledDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {scheduledDate
                                ? format(scheduledDate, "PPP", { locale: ptBR })
                                : "Selecione uma data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={scheduledDate}
                              onSelect={setScheduledDate}
                              disabled={(date) => date < new Date()}
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="w-32">
                        <Label className="text-xs">Hora</Label>
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sending limits */}
              <div className="space-y-3">
                <Label>Configurações de envio</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Limite diário</Label>
                    <Input
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(Number(e.target.value))}
                      min={1}
                      max={500}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Delay mín (seg)</Label>
                    <Input
                      type="number"
                      value={delayMin}
                      onChange={(e) => setDelayMin(Number(e.target.value))}
                      min={30}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Delay máx (seg)</Label>
                    <Input
                      type="number"
                      value={delayMax}
                      onChange={(e) => setDelayMax(Number(e.target.value))}
                      min={delayMin}
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Intervalo de {delayMin}s a {delayMax}s entre mensagens, máximo de {dailyLimit} envios por dia
                </p>
              </div>

              {/* Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium text-foreground">Resumo</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground">Campanha:</p>
                  <p className="font-medium">{name}</p>
                  <p className="text-muted-foreground">Destinatários:</p>
                  <p className="font-medium">{totalRecipients}</p>
                  <p className="text-muted-foreground">Variações de mensagem:</p>
                  <p className="font-medium">{selectedMessages.length}</p>
                  <p className="text-muted-foreground">Início:</p>
                  <p className="font-medium">
                    {scheduleType === "now"
                      ? "Imediatamente"
                      : scheduledDate
                      ? format(scheduledDate, "PPP", { locale: ptBR }) + " às " + scheduledTime
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => (step > 1 ? setStep(step - 1) : onOpenChange(false))}
          >
            {step > 1 ? "Voltar" : "Cancelar"}
          </Button>
          <Button
            onClick={() => {
              if (step < 3) {
                setStep(step + 1);
              } else {
                createCampaignMutation.mutate();
              }
            }}
            disabled={!canProceed() || createCampaignMutation.isPending}
          >
            {createCampaignMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : step < 3 ? (
              "Próximo"
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Criar Campanha
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
