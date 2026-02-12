import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Send, Image, Loader2, ChevronLeft, Smile, Paperclip, Mic, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

function PhonePreview({ message, mediaUrl }: { message: string; mediaUrl?: string }) {
  const currentTime = format(new Date(), "HH:mm");

  return (
    <div className="relative mx-auto" style={{ width: "280px" }}>
      <div className="relative bg-[#0b141a] rounded-[2.5rem] p-2 shadow-2xl border-4 border-[#1f2c33]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#0b141a] rounded-b-2xl z-10" />
        <div className="bg-[#0b141a] rounded-[2rem] overflow-hidden" style={{ height: "420px" }}>
          {/* Header */}
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

          {/* Chat */}
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
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div className={`bg-[#005c4b] px-2.5 py-1.5 rounded-lg ${mediaUrl ? "rounded-tr-none" : ""}`}>
                    <p className="text-white text-[13px] whitespace-pre-wrap leading-5">
                      {message || ""}
                    </p>
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

          {/* Input */}
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

export function IndividualSender() {
  const [phone, setPhone] = useState("");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [sending, setSending] = useState(false);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="w-5 h-5" />
            Envio Individual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Número do WhatsApp</Label>
            <Input
              placeholder="5511999999999"
              value={phone}
              onChange={handlePhoneChange}
            />
            <p className="text-xs text-muted-foreground">
              Cole no formato (19) 98237-2868 — será formatado automaticamente
            </p>
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              placeholder="Digite sua mensagem..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Image className="w-4 h-4" />
              URL da Imagem (opcional)
            </Label>
            <Input
              placeholder="https://exemplo.com/foto.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || !phone || !content}
            className="w-full"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {sending ? "Enviando..." : "Enviar Mensagem"}
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp Preview */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-muted-foreground">Preview</p>
        <PhonePreview message={content} mediaUrl={mediaUrl || undefined} />
      </div>
    </div>
  );
}
