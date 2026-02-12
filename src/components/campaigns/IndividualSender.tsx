import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Send, Image, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    <Card className="max-w-lg">
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

        {mediaUrl && (
          <div className="rounded-md overflow-hidden border border-border">
            <img
              src={mediaUrl}
              alt="Preview"
              className="w-full max-h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

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
  );
}
