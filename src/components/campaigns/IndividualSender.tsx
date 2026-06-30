import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Send, Image, Loader2, ChevronLeft, Smile, Paperclip, Mic, Camera, Plus, Pencil, Trash2, MessageSquareText, Sparkles, Wand2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

function PhonePreview({ message, mediaUrl }: { message: string; mediaUrl?: string }) {
  const currentTime = format(new Date(), "HH:mm");

  return (
    <div className="relative mx-auto" style={{ width: "280px" }}>
      <div className="relative bg-[#0b141a] rounded-[2.5rem] p-2 shadow-2xl border-4 border-[#1f2c33]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#0b141a] rounded-b-2xl z-10" />
        <div className="bg-[#0b141a] rounded-[2rem] overflow-hidden" style={{ height: "420px" }}>
          <div className="bg-[#1f2c33] px-3 py-2 flex items-center gap-3">
            <ChevronLeft className="w-5 h-5 text-[#00a884]" />
            <div className="w-9 h-9 rounded-full bg-[#6b7c85] flex items-center justify-center">
              <span className="text-white text-sm font-medium">C</span>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Cliente</p>
              <p className="text-[#8696a0] text-xs">online</p>
            </div>
          </div>

          <div
            className="p-3 overflow-y-auto"
            style={{
              height: "calc(100% - 110px)",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: "#0b141a",
            }}
          >
            {(message || mediaUrl) ? (
              <div className="flex justify-end mb-2">
                <div className="max-w-[85%]">
                  {mediaUrl && (
                    <div className="bg-[#005c4b] rounded-t-lg rounded-bl-lg overflow-hidden mb-0.5">
                      <img
                        src={mediaUrl}
                        alt="Preview"
                        className="w-full max-h-40 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                  <div className={`bg-[#005c4b] px-2.5 py-1.5 rounded-lg ${mediaUrl ? "rounded-tr-none" : ""}`}>
                    <p className="text-white text-[13px] whitespace-pre-wrap leading-5">{message || ""}</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-[10px] text-[#8696a0]">{currentTime}</span>
                      <svg className="w-4 h-3 text-[#53bdeb]" viewBox="0 0 16 11" fill="currentColor">
                        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .512.203.681.681 0 0 0 .496-.203l6.636-8.418a.424.424 0 0 0 .089-.305.447.447 0 0 0-.14-.305l-.32-.298zm-1.165 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.4-1.322-.311.311a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l1.991 1.991a.724.724 0 0 0 .512.203.681.681 0 0 0 .496-.203l6.636-8.418a.424.424 0 0 0 .089-.305.447.447 0 0 0-.14-.305l-.32-.298-.678-.046z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[#8696a0] text-xs text-center">
                  Digite uma mensagem para<br />visualizar o preview
                </p>
              </div>
            )}
          </div>

          <div className="bg-[#1f2c33] px-2 py-2 flex items-center gap-2">
            <Smile className="w-5 h-5 text-[#8696a0]" />
            <Paperclip className="w-5 h-5 text-[#8696a0]" />
            <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5">
              <p className="text-[#8696a0] text-xs">Mensagem</p>
            </div>
            <Camera className="w-5 h-5 text-[#8696a0]" />
            <Mic className="w-5 h-5 text-[#8696a0]" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface SavedMessage {
  id: string;
  title: string;
  content: string;
  media_url: string | null;
}

function SavedMessageDialog({
  open,
  onOpenChange,
  editItem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: SavedMessage | null;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(editItem?.title || "");
  const [body, setBody] = useState(editItem?.content || "");
  const [imgUrl, setImgUrl] = useState(editItem?.media_url || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Preencha título e conteúdo");
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await supabase
          .from("quick_responses")
          .update({ title, content: body, media_url: imgUrl || null, category: "individual" })
          .eq("id", editItem.id);
        if (error) throw error;
        toast.success("Mensagem atualizada!");
      } else {
        const { error } = await supabase
          .from("quick_responses")
          .insert({ title, content: body, media_url: imgUrl || null, category: "individual" });
        if (error) throw error;
        toast.success("Mensagem salva!");
      }
      queryClient.invalidateQueries({ queryKey: ["saved-individual-messages"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset fields when dialog opens with new data
  useState(() => {
    setTitle(editItem?.title || "");
    setBody(editItem?.content || "");
    setImgUrl(editItem?.media_url || "");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editItem ? "Editar Mensagem" : "Nova Mensagem Salva"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input placeholder="Ex: Promoção de verão" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Conteúdo</Label>
            <Textarea placeholder="Texto da mensagem..." value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          </div>
          <div className="space-y-1">
            <Label>URL da Imagem (opcional)</Label>
            <Input placeholder="https://..." value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const replaceLinkTags = (text: string, link?: string) =>
  link
    ? text
        .replace(/\[link_pagamento\]/gi, link)
        .replace(/\[link_recuperacao\]/gi, link)
        .replace(/\[link_checkout\]/gi, link)
    : text;

export function IndividualSender({ initialPhone, initialMessage, initialLink, initialImage }: { initialPhone?: string; initialMessage?: string; initialLink?: string; initialImage?: string }) {
  const [phone, setPhone] = useState(initialPhone || "");
  const [content, setContent] = useState(replaceLinkTags(initialMessage || "", initialLink));
  const [mediaUrl, setMediaUrl] = useState(initialImage || "");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<SavedMessage | null>(null);

  const [improvingAI, setImprovingAI] = useState(false);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [aiVariants, setAiVariants] = useState<string[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);

      setMediaUrl(publicUrl);
      toast.success("Imagem enviada!");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };


  const queryClient = useQueryClient();

  const handleAI = async (mode: "generate" | "improve") => {
    if (mode === "improve" && !content.trim()) {
      toast.error("Digite uma mensagem primeiro para melhorar");
      return;
    }
    setImprovingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-message", {
        body: { message: content, mode, variants: 3 },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      const list: string[] = Array.isArray(data.variants) && data.variants.length > 0 ? data.variants : [data.message];
      if (list.length === 1) {
        setContent(list[0]);
        toast.success(mode === "generate" ? "Mensagem gerada!" : "Mensagem melhorada!");
      } else {
        setAiVariants(list);
        setVariantsOpen(true);
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setImprovingAI(false);
    }
  };

  const { data: savedMessages = [] } = useQuery({
    queryKey: ["saved-individual-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_responses")
        .select("id, title, content, media_url")
        .eq("category", "individual")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedMessage[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quick_responses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-individual-messages"] });
      toast.success("Mensagem excluída");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (digits.length >= 10 && !digits.startsWith("55")) {
      setPhone("55" + digits);
    } else {
      setPhone(digits);
    }
  };

  const handleSend = async () => {
    if (!phone || !content) {
      toast.error("Preencha o número e a mensagem");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-individual", {
        body: { phone, content, mediaUrl: mediaUrl || undefined },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success("Mensagem enviada com sucesso!");
      setContent("");
      setMediaUrl("");
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao enviar: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const selectSavedMessage = (msg: SavedMessage) => {
    setContent(replaceLinkTags(msg.content, initialLink));
    if (msg.media_url) setMediaUrl(msg.media_url);
  };

  const openEdit = (msg: SavedMessage) => {
    setEditItem(msg);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditItem(null);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
        <div className="space-y-4">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Send className="w-5 h-5 text-primary" />
                Campanha Individual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Número do WhatsApp</Label>
                <Input placeholder="5511999999999" value={phone} onChange={handlePhoneChange} />
                <p className="text-xs text-muted-foreground">
                  Cole no formato (19) 98237-2868 — será formatado automaticamente
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Mensagem</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" disabled={improvingAI} className="h-7 gap-1.5 text-xs">
                        {improvingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        IA
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAI("generate")}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Gerar mensagem
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAI("improve")} disabled={!content.trim()}>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Melhorar texto
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Textarea placeholder="Digite sua mensagem..." value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Image className="w-4 h-4" />
                  URL da Imagem ou Upload (opcional)
                </Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://exemplo.com/foto.jpg" 
                    value={mediaUrl} 
                    onChange={(e) => setMediaUrl(e.target.value)} 
                    className="flex-1"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      id="image-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      asChild
                      disabled={uploading}
                    >
                      <label htmlFor="image-upload" className="cursor-pointer">
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </label>
                    </Button>
                  </div>
                </div>
              </div>

              <Button onClick={handleSend} disabled={sending || !phone || !content} className="w-full">
                {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                {sending ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </CardContent>
          </Card>

          {/* Saved Messages */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquareText className="w-5 h-5" />
                  Mensagens Salvas
                </CardTitle>
                <Button size="sm" variant="outline" onClick={openNew}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {savedMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma mensagem salva. Clique em "Adicionar" para criar.
                </p>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {savedMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex items-center gap-2 p-2.5 rounded-md border border-border hover:bg-muted/50 cursor-pointer group transition-colors"
                        onClick={() => selectSavedMessage(msg)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{msg.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{msg.content}</p>
                        </div>
                        {msg.media_url && <Image className="w-4 h-4 text-muted-foreground shrink-0" />}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => { e.stopPropagation(); openEdit(msg); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(msg.id); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* WhatsApp Preview */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">Preview</p>
          <PhonePreview message={content} mediaUrl={mediaUrl || undefined} />
        </div>
      </div>

      <SavedMessageDialog open={dialogOpen} onOpenChange={setDialogOpen} editItem={editItem} />

      <Dialog open={variantsOpen} onOpenChange={setVariantsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Escolha uma variação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {aiVariants.map((v, i) => (
              <button
                key={i}
                onClick={() => {
                  setContent(v);
                  setVariantsOpen(false);
                  toast.success(`Variação ${i + 1} aplicada`);
                }}
                className="w-full text-left p-3 border border-border hover:bg-muted/50 hover:border-primary transition-colors"
              >
                <p className="text-xs font-semibold text-muted-foreground mb-1">Variação {i + 1}</p>
                <p className="text-sm whitespace-pre-wrap">{v}</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantsOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
