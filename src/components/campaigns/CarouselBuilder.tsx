import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Trash2,
  Send,
  Loader2,
  Phone,
  ImagePlus,
  Link as LinkIcon,
  GalleryHorizontalEnd,
  ChevronLeft,
  ChevronRight,
  Users,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CarouselButton {
  type: "url" | "reply";
  title: string;
  url: string;
}

interface CarouselCard {
  header: string;
  body: string;
  footer: string;
  image: string;
  buttons: CarouselButton[];
}

interface Cluster {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  customer_count: number;
  color: string;
}

const emptyCard = (): CarouselCard => ({
  header: "",
  body: "",
  footer: "",
  image: "",
  buttons: [{ type: "url", title: "", url: "" }],
});

type SendMode = "manual" | "clusters";

export function CarouselBuilder() {
  const [sendMode, setSendMode] = useState<SendMode>("manual");
  const [phone, setPhone] = useState("");
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [messageText, setMessageText] = useState("");
  const [cards, setCards] = useState<CarouselCard[]>([emptyCard()]);
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [previewCardIdx, setPreviewCardIdx] = useState(0);
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [dailyLimit, setDailyLimit] = useState(50);
  const [delayMin, setDelayMin] = useState(180);
  const [delayMax, setDelayMax] = useState(480);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);


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

  const selectedClusterData = clusters?.filter((c) => selectedClusters.includes(c.id));

  const generateMessageText = async () => {
    const clusterInfo = selectedClusterData?.[0];
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-messages", {
        body: {
          clusterName: clusterInfo?.name || "Clientes gerais",
          clusterDescription: clusterInfo?.description || "",
          objective: "Apresentar produtos/serviços via carrossel interativo",
          recommendation: "Criar texto curto e atrativo que acompanhe o carrossel",
          messageCount: 1,
        },
      });
      if (error) throw error;
      if (data?.messages?.[0]?.content) {
        setMessageText(data.messages[0].content);
        toast.success("Texto gerado com sucesso!");
      } else {
        throw new Error("Resposta inválida da IA");
      }
    } catch (error: any) {
      console.error("Error generating text:", error);
      toast.error("Erro ao gerar texto: " + (error.message || "Tente novamente"));
    } finally {
      setIsGenerating(false);
    }
  };

  const totalRecipients = clusters
    ?.filter((c) => selectedClusters.includes(c.id))
    .reduce((sum, c) => sum + c.customer_count, 0) || 0;

  const toggleCluster = (id: string) => {
    setSelectedClusters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const activeCard = cards[activeCardIdx];

  const updateCard = (idx: number, field: keyof CarouselCard, value: string) => {
    setCards((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  const updateButton = (cardIdx: number, btnIdx: number, field: keyof CarouselButton, value: string) => {
    setCards((prev) =>
      prev.map((c, i) =>
        i === cardIdx
          ? {
              ...c,
              buttons: c.buttons.map((b, j) =>
                j === btnIdx ? { ...b, [field]: value } : b
              ),
            }
          : c
      )
    );
  };

  const addButton = (cardIdx: number) => {
    setCards((prev) =>
      prev.map((c, i) =>
        i === cardIdx && c.buttons.length < 3
          ? { ...c, buttons: [...c.buttons, { type: "url" as const, title: "", url: "" }] }
          : c
      )
    );
  };

  const removeButton = (cardIdx: number, btnIdx: number) => {
    setCards((prev) =>
      prev.map((c, i) =>
        i === cardIdx && c.buttons.length > 1
          ? { ...c, buttons: c.buttons.filter((_, j) => j !== btnIdx) }
          : c
      )
    );
  };

  const addCard = () => {
    if (cards.length >= 10) {
      toast.error("Máximo de 10 cards");
      return;
    }
    const newCards = [...cards, emptyCard()];
    setCards(newCards);
    setActiveCardIdx(newCards.length - 1);
  };

  const removeCard = (idx: number) => {
    if (cards.length <= 1) return;
    setCards((prev) => prev.filter((_, i) => i !== idx));
    if (activeCardIdx >= idx && activeCardIdx > 0) {
      setActiveCardIdx(activeCardIdx - 1);
    }
    if (previewCardIdx >= idx && previewCardIdx > 0) {
      setPreviewCardIdx(previewCardIdx - 1);
    }
  };

  const sendCarousel = async () => {
    if (sendMode === "manual" && !phone.trim()) {
      toast.error("Digite o número de WhatsApp");
      return;
    }
    if (sendMode === "clusters" && selectedClusters.length === 0) {
      toast.error("Selecione pelo menos um cluster");
      return;
    }
    if (cards.some((c) => !c.body.trim())) {
      toast.error("Todos os cards precisam ter texto no corpo");
      return;
    }

    setIsSending(true);
    setSendProgress({ sent: 0, failed: 0, total: 0 });

    const carouselPayload = cards.map((c) => ({
      header: c.header,
      body: c.body,
      footer: c.footer,
      image: c.image,
      buttons: c.buttons.filter((b) => b.title.trim()),
    }));

    try {
      if (sendMode === "manual") {
        const { data, error } = await supabase.functions.invoke("send-carousel", {
          body: { number: phone.trim(), text: messageText, carousel: carouselPayload },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success("Carrossel enviado com sucesso!");
      } else {
        // Fetch phones and names from selected clusters
        const { data: customers, error: fetchErr } = await supabase
          .from("imported_customers")
          .select("phone, name")
          .in("cluster_id", selectedClusters)
          .not("phone", "is", null);

        if (fetchErr) throw fetchErr;

        const validCustomers = customers
          ?.filter((c) => {
            const clean = c.phone?.replace(/\D/g, "");
            return clean && clean.length >= 10;
          })
          .map((c) => ({
            phone: c.phone!.replace(/\D/g, ""),
            name: c.name || "",
          })) || [];

        if (validCustomers.length === 0) {
          toast.error("Nenhum cliente com telefone válido nos clusters selecionados");
          return;
        }

        setSendProgress({ sent: 0, failed: 0, total: validCustomers.length });

        let sent = 0;
        let failed = 0;
        let sentToday = 0;

        for (const customer of validCustomers) {
          if (sentToday >= dailyLimit) {
            toast.info(`Limite diário de ${dailyLimit} atingido. Restantes: ${validCustomers.length - sent - failed}`);
            break;
          }

          // Replace {{nome}} variable in text and card fields
          const personalizedText = messageText.replace(/\{\{nome\}\}/gi, customer.name);
          const personalizedCarousel = carouselPayload.map((c) => ({
            ...c,
            header: c.header.replace(/\{\{nome\}\}/gi, customer.name),
            body: c.body.replace(/\{\{nome\}\}/gi, customer.name),
            footer: c.footer.replace(/\{\{nome\}\}/gi, customer.name),
          }));

          try {
            const { data, error } = await supabase.functions.invoke("send-carousel", {
              body: { number: customer.phone, text: personalizedText, carousel: personalizedCarousel },
            });
            if (error || data?.error) {
              failed++;
            } else {
              sent++;
              sentToday++;
            }
          } catch {
            failed++;
          }
          setSendProgress({ sent, failed, total: validCustomers.length });

          // Random delay between delayMin and delayMax (in seconds)
          const delay = (delayMin + Math.random() * (delayMax - delayMin)) * 1000;
          await new Promise((r) => setTimeout(r, delay));
        }

        toast.success(`Carrossel enviado! ${sent} sucesso, ${failed} falhas de ${validCustomers.length}`);
      }
    } catch (error: any) {
      console.error("Error sending carousel:", error);
      toast.error("Erro ao enviar: " + (error.message || "Tente novamente"));
    } finally {
      setIsSending(false);
      setSendProgress({ sent: 0, failed: 0, total: 0 });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Editor */}
      <div className="flex-1 space-y-4">
        {/* Recipient Selection */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={sendMode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setSendMode("manual")}
              >
                <Phone className="w-4 h-4 mr-1" />
                Número manual
              </Button>
              <Button
                variant={sendMode === "clusters" ? "default" : "outline"}
                size="sm"
                onClick={() => setSendMode("clusters")}
              >
                <Users className="w-4 h-4 mr-1" />
                Clusters
              </Button>
            </div>

            {sendMode === "manual" ? (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Número de WhatsApp
                </Label>
                <Input
                  placeholder="5511999999999"
                  value={phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    // Auto-prefix with 55 if pasted Brazilian format without country code
                    if (digits.length >= 10 && !digits.startsWith("55")) {
                      setPhone("55" + digits);
                    } else {
                      setPhone(digits);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Selecione os clusters
                </Label>
                {clusters && clusters.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {clusters.map((cluster) => (
                      <label
                        key={cluster.id}
                        className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedClusters.includes(cluster.id)}
                          onCheckedChange={() => toggleCluster(cluster.id)}
                        />
                        <span className="text-sm">
                          {cluster.emoji} {cluster.name}
                        </span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {cluster.customer_count}
                        </Badge>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum cluster com clientes encontrado</p>
                )}
                {selectedClusters.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Total: {totalRecipients} destinatários
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Texto da mensagem (opcional)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateMessageText}
                  disabled={isGenerating}
                  className="h-6 text-xs"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="w-3 h-3 mr-1" />
                  )}
                  Gerar com IA
                </Button>
              </div>
              <Textarea
                placeholder="Texto que acompanha o carrossel... Use {{nome}} para personalizar"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={2}
              />
            </div>
            {sendMode === "clusters" && (
              <div className="space-y-3 pt-2 border-t border-border">
                <Label className="text-xs font-medium">Controle de envio</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Limite diário</Label>
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
                    <Label className="text-xs text-muted-foreground">Delay mín (s)</Label>
                    <Input
                      type="number"
                      value={delayMin}
                      onChange={(e) => setDelayMin(Number(e.target.value))}
                      min={30}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Delay máx (s)</Label>
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
                  {totalRecipients > 0 && ` · ~${Math.ceil(totalRecipients / dailyLimit)} dias`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {cards.map((_, idx) => (
            <Button
              key={idx}
              variant={activeCardIdx === idx ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCardIdx(idx)}
            >
              Card {idx + 1}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={addCard} disabled={cards.length >= 10}>
            <Plus className="w-4 h-4" />
          </Button>
          <Badge variant="secondary" className="ml-auto">
            {cards.length}/10 cards
          </Badge>
        </div>

        {/* Active Card Editor */}
        {activeCard && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Card {activeCardIdx + 1}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeCard(activeCardIdx)}
                  disabled={cards.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <ImagePlus className="w-3 h-3" />
                  URL da imagem
                </Label>
                <Input
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={activeCard.image}
                  onChange={(e) => updateCard(activeCardIdx, "image", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Título</Label>
                <Input
                  placeholder="Título do card"
                  value={activeCard.header}
                  onChange={(e) => updateCard(activeCardIdx, "header", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Corpo *</Label>
                <Textarea
                  placeholder="Descrição do card..."
                  value={activeCard.body}
                  onChange={(e) => updateCard(activeCardIdx, "body", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Rodapé (opcional)</Label>
                <Input
                  placeholder="Texto de rodapé"
                  value={activeCard.footer}
                  onChange={(e) => updateCard(activeCardIdx, "footer", e.target.value)}
                />
              </div>

              {/* Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    Botões
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addButton(activeCardIdx)}
                    disabled={activeCard.buttons.length >= 3}
                    className="h-6 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Botão
                  </Button>
                </div>
                {activeCard.buttons.map((btn, btnIdx) => (
                  <div key={btnIdx} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="Texto do botão"
                        value={btn.title}
                        onChange={(e) => updateButton(activeCardIdx, btnIdx, "title", e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="https://link.com"
                        value={btn.url}
                        onChange={(e) => updateButton(activeCardIdx, btnIdx, "url", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeButton(activeCardIdx, btnIdx)}
                      disabled={activeCard.buttons.length <= 1}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Send */}
        {isSending && sendProgress.total > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            Enviando: {sendProgress.sent + sendProgress.failed}/{sendProgress.total} 
            ({sendProgress.sent} ✓ {sendProgress.failed > 0 ? `${sendProgress.failed} ✗` : ""})
          </div>
        )}
        <Button
          onClick={sendCarousel}
          disabled={isSending || (sendMode === "manual" ? !phone.trim() : selectedClusters.length === 0)}
          className="w-full"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {sendMode === "clusters" && totalRecipients > 0
            ? `Enviar para ${totalRecipients} clientes`
            : "Enviar Carrossel"}
        </Button>
      </div>

      {/* Preview */}
      <div className="lg:w-[320px] shrink-0">
        <div className="sticky top-0">
          <p className="text-xs text-muted-foreground mb-3 text-center">Preview do Carrossel</p>
          <div className="relative mx-auto" style={{ width: "280px" }}>
            <div className="relative bg-[#0b141a] rounded-[2.5rem] p-2 shadow-2xl border-4 border-[#1f2c33]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#0b141a] rounded-b-2xl z-10" />
              <div className="bg-[#0b141a] rounded-[2rem] overflow-hidden" style={{ height: "480px" }}>
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

                {/* Chat */}
                <ScrollArea
                  className="p-3"
                  style={{
                    height: "calc(100% - 110px)",
                    backgroundColor: "#0b141a",
                  }}
                >
                  {/* Message text */}
                  {messageText && (
                    <div className="flex justify-end mb-2">
                      <div className="bg-[#005c4b] px-2.5 py-1.5 rounded-lg max-w-[85%]">
                        <p className="text-white text-[13px] whitespace-pre-wrap leading-5">
                          {messageText}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Carousel cards */}
                  <div className="flex justify-end mb-2">
                    <div className="max-w-[85%]">
                      {/* Card navigation */}
                      <div className="flex items-center justify-between mb-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-[#8696a0]"
                          onClick={() => setPreviewCardIdx(Math.max(0, previewCardIdx - 1))}
                          disabled={previewCardIdx === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-[10px] text-[#8696a0]">
                          {previewCardIdx + 1}/{cards.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-[#8696a0]"
                          onClick={() =>
                            setPreviewCardIdx(Math.min(cards.length - 1, previewCardIdx + 1))
                          }
                          disabled={previewCardIdx === cards.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Card preview */}
                      {cards[previewCardIdx] && (
                        <div className="bg-[#1f2c33] rounded-lg overflow-hidden">
                          {cards[previewCardIdx].image && (
                            <img
                              src={cards[previewCardIdx].image}
                              alt="Card"
                              className="w-full h-28 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <div className="p-2.5 space-y-1">
                            {cards[previewCardIdx].header && (
                              <p className="text-white text-[13px] font-semibold">
                                {cards[previewCardIdx].header}
                              </p>
                            )}
                            <p className="text-[#d1d7db] text-[12px] leading-4">
                              {cards[previewCardIdx].body || "Corpo do card..."}
                            </p>
                            {cards[previewCardIdx].footer && (
                              <p className="text-[#8696a0] text-[11px]">
                                {cards[previewCardIdx].footer}
                              </p>
                            )}
                          </div>
                          {/* Buttons */}
                          <div className="border-t border-[#2a3942]">
                            {cards[previewCardIdx].buttons
                              .filter((b) => b.title.trim())
                              .map((btn, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-center gap-1 py-2 text-[#53bdeb] text-[13px] border-b border-[#2a3942] last:border-b-0"
                                >
                                  <LinkIcon className="w-3 h-3" />
                                  {btn.title}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="bg-[#1f2c33] px-2 py-2 flex items-center gap-2">
                  <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
                    <span className="text-[#8696a0] text-sm">Mensagem</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#111b21]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
                    </svg>
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
