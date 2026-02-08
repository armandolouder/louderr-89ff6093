import { useState, useRef } from "react";
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
  Users,
  MessageSquare,
  Send,
  Check,
  X,
  Smile,
  Plus,
  Trash2,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  Phone
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

interface CampaignMessage {
  content: string;
  variant: string;
  mediaUrl: string;
  mediaType: "none" | "image" | "video";
}

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMOJI_LIST = ["😀", "😊", "🎉", "🔥", "💯", "✨", "❤️", "👍", "🙌", "💪", "🎁", "💰", "⭐", "🚀", "📢", "💬", "📱", "🛒", "💳", "🏷️", "😍", "🤩", "💕", "🎊", "👏"];

// WhatsApp Phone Preview Component
function PhonePreview({ message, mediaUrl, mediaType }: { message: string; mediaUrl?: string; mediaType?: string }) {
  const previewMessage = message.replace(/\{\{nome\}\}/gi, "João");
  const currentTime = format(new Date(), "HH:mm");

  return (
    <div className="relative mx-auto" style={{ width: "280px" }}>
      {/* Phone Frame */}
      <div className="relative bg-[#0b141a] rounded-[2.5rem] p-2 shadow-2xl border-4 border-[#1f2c33]">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#0b141a] rounded-b-2xl z-10" />
        
        {/* Screen */}
        <div className="bg-[#0b141a] rounded-[2rem] overflow-hidden" style={{ height: "500px" }}>
          {/* WhatsApp Header */}
          <div className="bg-[#1f2c33] px-3 py-2 flex items-center gap-3">
            <ChevronLeft className="w-5 h-5 text-[#00a884]" />
            <div className="w-9 h-9 rounded-full bg-[#6b7c85] flex items-center justify-center">
              <span className="text-white text-sm font-medium">L</span>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Louder</p>
              <p className="text-[#8696a0] text-xs">online</p>
            </div>
          </div>

          {/* Chat Background */}
          <div 
            className="flex-1 p-3 overflow-y-auto"
            style={{ 
              height: "calc(100% - 110px)",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: "#0b141a"
            }}
          >
            {/* Message Bubble */}
            <div className="flex justify-end mb-2">
              <div className="max-w-[85%]">
                {/* Media Preview */}
                {mediaUrl && (
                  <div className="bg-[#005c4b] rounded-t-lg rounded-bl-lg overflow-hidden mb-0.5">
                    {mediaType === "video" ? (
                      <video 
                        src={mediaUrl} 
                        className="w-full max-h-40 object-cover"
                      />
                    ) : (
                      <img 
                        src={mediaUrl} 
                        alt="Preview" 
                        className="w-full max-h-40 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                )}
                
                {/* Text Bubble */}
                <div className={cn(
                  "bg-[#005c4b] px-2.5 py-1.5 rounded-lg",
                  mediaUrl ? "rounded-tr-none" : "rounded-tr-lg"
                )}>
                  <p className="text-white text-[13px] whitespace-pre-wrap leading-5">
                    {previewMessage || "Digite sua mensagem..."}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[10px] text-[#8696a0]">{currentTime}</span>
                    <svg className="w-4 h-3 text-[#53bdeb]" viewBox="0 0 16 11" fill="currentColor">
                      <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .512.203.681.681 0 0 0 .496-.203l6.636-8.418a.424.424 0 0 0 .089-.305.447.447 0 0 0-.14-.305l-.32-.298zm-1.165 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.4-1.322-.311.311a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l1.991 1.991a.724.724 0 0 0 .512.203.681.681 0 0 0 .496-.203l6.636-8.418a.424.424 0 0 0 .089-.305.447.447 0 0 0-.14-.305l-.32-.298-.678-.046z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-[#1f2c33] px-2 py-2 flex items-center gap-2">
            <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
              <span className="text-[#8696a0] text-sm">Mensagem</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#111b21]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreateCampaignDialog({ open, onOpenChange }: CreateCampaignDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [activeMessageIdx, setActiveMessageIdx] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [delayMin, setDelayMin] = useState(180);
  const [delayMax, setDelayMax] = useState(480);
  const [scheduleType, setScheduleType] = useState<"now" | "scheduled">("now");
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<number | null>(null);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

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
  const activeMessage = messages[activeMessageIdx];

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

      const generatedMessages: CampaignMessage[] = (data.messages || []).map((msg: any) => ({
        content: msg.content,
        variant: msg.variant,
        mediaUrl: "",
        mediaType: "none" as const,
      }));
      
      setMessages(generatedMessages);
      setSelectedMessages([0]);
      setActiveMessageIdx(0);
      toast.success("Mensagens geradas com sucesso!");
    } catch (error) {
      console.error("Error generating messages:", error);
      toast.error("Erro ao gerar mensagens. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const addNewMessage = () => {
    const newVariant = String.fromCharCode(65 + messages.length);
    const newMessages = [...messages, {
      content: "",
      variant: newVariant,
      mediaUrl: "",
      mediaType: "none" as const,
    }];
    setMessages(newMessages);
    setActiveMessageIdx(newMessages.length - 1);
  };

  const updateMessage = (idx: number, field: keyof CampaignMessage, value: string) => {
    setMessages(prev => prev.map((msg, i) => 
      i === idx ? { ...msg, [field]: value } : msg
    ));
  };

  const removeMessage = (idx: number) => {
    if (messages.length <= 1) return;
    setMessages(prev => prev.filter((_, i) => i !== idx));
    setSelectedMessages(prev => prev.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
    if (activeMessageIdx >= idx && activeMessageIdx > 0) {
      setActiveMessageIdx(activeMessageIdx - 1);
    }
  };

  const insertEmoji = (emoji: string) => {
    const idx = activeMessageIdx;
    const textarea = textareaRefs.current[0];
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = messages[idx].content;
      const newContent = currentContent.substring(0, start) + emoji + currentContent.substring(end);
      updateMessage(idx, "content", newContent);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      updateMessage(idx, "content", messages[idx].content + emoji);
    }
    setActiveEmojiPicker(null);
  };

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      let scheduled_at: string | null = null;
      if (scheduleType === "scheduled" && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(":").map(Number);
        const dateTime = new Date(scheduledDate);
        dateTime.setHours(hours, minutes, 0, 0);
        scheduled_at = dateTime.toISOString();
      }

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

      const selectedMsgs = selectedMessages.map((idx) => messages[idx]);
      const { error: msgError } = await supabase.from("campaign_messages").insert(
        selectedMsgs.map((msg) => ({
          campaign_id: campaign.id,
          content: msg.content,
          message_type: msg.mediaType === "none" ? "text" : msg.mediaType,
          media_url: msg.mediaUrl || null,
        }))
      );

      if (msgError) throw msgError;

      let allCustomers: any[] = [];
      let offset = 0;
      const pageSize = 1000;

      while (true) {
        const { data: batch, error: customersError } = await supabase
          .from("imported_customers")
          .select("id, name, phone, cluster_id")
          .in("cluster_id", selectedClusters)
          .eq("phone_status", "valid")
          .not("phone", "is", null)
          .range(offset, offset + pageSize - 1);

        if (customersError) throw customersError;
        if (!batch || batch.length === 0) break;
        
        allCustomers = allCustomers.concat(batch);
        if (batch.length < pageSize) break;
        offset += pageSize;
      }

      if (allCustomers.length > 0) {
        const queueEntries = allCustomers.map((customer) => {
          const randomMsgIdx = Math.floor(Math.random() * selectedMsgs.length);
          const message = selectedMsgs[randomMsgIdx];
          const personalizedContent = message.content.replace(/\{\{nome\}\}/gi, customer.name.split(" ")[0]);

          return {
            campaign_id: campaign.id,
            customer_id: customer.id,
            phone: customer.phone!,
            content: personalizedContent,
            status: "pending",
            metadata: message.mediaUrl ? { media_url: message.mediaUrl, media_type: message.mediaType } : {},
          };
        });

        const batchSize = 500;
        for (let i = 0; i < queueEntries.length; i += batchSize) {
          const batch = queueEntries.slice(i, i + batchSize);
          const { error: queueError } = await supabase.from("whatsapp_queue").insert(batch);
          if (queueError) throw queueError;
        }

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
    setSelectedMessages([]);
    setActiveMessageIdx(0);
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
        return messages.length > 0 && selectedMessages.length > 0 && 
          selectedMessages.every(idx => messages[idx]?.content.trim().length > 0);
      case 3:
        return scheduleType === "now" || (scheduledDate !== undefined);
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Nova Campanha
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Defina o nome e selecione os segmentos de clientes"}
            {step === 2 && "Crie suas mensagens com preview em tempo real"}
            {step === 3 && "Configure o envio e agendamento"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 px-6 py-3 border-b shrink-0">
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
                <div className={cn("w-12 h-1 rounded", step > s ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          ))}
          <div className="flex-1" />
          <Badge variant="outline" className="text-xs">
            {totalRecipients} destinatários
          </Badge>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Clusters */}
          {step === 1 && (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4 max-w-2xl mx-auto">
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
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{cluster.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {cluster.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          <Users className="w-3 h-3 mr-1" />
                          {cluster.customer_count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Step 2: Messages with Phone Preview */}
          {step === 2 && (
            <div className="flex h-full">
              {/* Editor Side */}
              <div className="flex-1 border-r overflow-hidden flex flex-col">
                <div className="p-4 border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Label>Mensagens</Label>
                    <Badge variant="secondary">{messages.length}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={addNewMessage}>
                      <Plus className="w-4 h-4 mr-1" />
                      Nova
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateMessages}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1" />
                          IA
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12 border rounded-lg bg-muted/50">
                        <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground mb-2">Nenhuma mensagem criada</p>
                        <p className="text-xs text-muted-foreground">
                          Use "IA" para gerar ou "Nova" para criar manualmente
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Message Tabs */}
                        <div className="flex gap-2 flex-wrap">
                          {messages.map((msg, idx) => (
                            <Button
                              key={idx}
                              variant={activeMessageIdx === idx ? "default" : "outline"}
                              size="sm"
                              onClick={() => setActiveMessageIdx(idx)}
                              className="gap-2"
                            >
                              <Checkbox
                                checked={selectedMessages.includes(idx)}
                                onCheckedChange={() => toggleMessage(idx)}
                                onClick={(e) => e.stopPropagation()}
                                className={activeMessageIdx === idx ? "border-primary-foreground" : ""}
                              />
                              Variante {msg.variant}
                            </Button>
                          ))}
                        </div>

                        {/* Active Message Editor */}
                        {activeMessage && (
                          <div className="space-y-4 border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <Badge>Editando: Variante {activeMessage.variant}</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => removeMessage(activeMessageIdx)}
                                disabled={messages.length <= 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Text Editor */}
                            <div className="relative">
                              <Textarea
                                ref={(el) => { textareaRefs.current[0] = el; }}
                                value={activeMessage.content}
                                onChange={(e) => updateMessage(activeMessageIdx, "content", e.target.value)}
                                placeholder="Digite sua mensagem... Use {{nome}} para personalizar"
                                rows={6}
                                className="pr-10 resize-none"
                              />
                              <Popover 
                                open={activeEmojiPicker === activeMessageIdx} 
                                onOpenChange={(open) => setActiveEmojiPicker(open ? activeMessageIdx : null)}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2 h-8 w-8 p-0"
                                  >
                                    <Smile className="w-5 h-5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-2" align="end">
                                  <div className="grid grid-cols-5 gap-1">
                                    {EMOJI_LIST.map((emoji) => (
                                      <Button
                                        key={emoji}
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 w-9 p-0 text-xl"
                                        onClick={() => insertEmoji(emoji)}
                                      >
                                        {emoji}
                                      </Button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Use {"{{nome}}"} para nome do cliente</span>
                              <span>{activeMessage.content.length}/300</span>
                            </div>

                            {/* Media URL */}
                            <div className="space-y-2">
                              <Label className="text-sm flex items-center gap-2">
                                <ImagePlus className="w-4 h-4" />
                                Imagem/Vídeo (opcional)
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Cole a URL da mídia..."
                                  value={activeMessage.mediaUrl}
                                  onChange={(e) => {
                                    updateMessage(activeMessageIdx, "mediaUrl", e.target.value);
                                    if (e.target.value) {
                                      const isVideo = e.target.value.match(/\.(mp4|webm|mov)(\?|$)/i);
                                      updateMessage(activeMessageIdx, "mediaType", isVideo ? "video" : "image");
                                    } else {
                                      updateMessage(activeMessageIdx, "mediaType", "none");
                                    }
                                  }}
                                  className="flex-1"
                                />
                                {activeMessage.mediaUrl && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      updateMessage(activeMessageIdx, "mediaUrl", "");
                                      updateMessage(activeMessageIdx, "mediaType", "none");
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          ✓ Selecione as mensagens que serão enviadas aleatoriamente aos clientes
                        </p>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Phone Preview Side */}
              <div className="w-[320px] bg-muted/30 p-6 flex flex-col items-center justify-center shrink-0">
                <p className="text-xs text-muted-foreground mb-4 text-center">Preview WhatsApp</p>
                <PhonePreview 
                  message={activeMessage?.content || ""} 
                  mediaUrl={activeMessage?.mediaUrl}
                  mediaType={activeMessage?.mediaType}
                />
              </div>
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 3 && (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6 max-w-2xl mx-auto">
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
                    Intervalo de {Math.floor(delayMin / 60)}m{delayMin % 60}s a {Math.floor(delayMax / 60)}m{delayMax % 60}s entre mensagens
                  </p>
                </div>

                {/* Summary */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <h4 className="font-medium text-foreground">Resumo da Campanha</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Nome</p>
                      <p className="font-medium">{name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Destinatários</p>
                      <p className="font-medium">{totalRecipients}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Mensagens</p>
                      <p className="font-medium">{selectedMessages.length} variações</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Tempo estimado</p>
                      <p className="font-medium">~{Math.ceil(totalRecipients / dailyLimit)} dias</p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="text-muted-foreground">Início</p>
                      <p className="font-medium">
                        {scheduleType === "now"
                          ? "Imediatamente após criar"
                          : scheduledDate
                          ? format(scheduledDate, "PPP", { locale: ptBR }) + " às " + scheduledTime
                          : "Data não selecionada"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          <Button
            variant="outline"
            onClick={() => (step > 1 ? setStep(step - 1) : onOpenChange(false))}
          >
            {step > 1 ? (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </>
            ) : (
              "Cancelar"
            )}
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
              <>
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
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
