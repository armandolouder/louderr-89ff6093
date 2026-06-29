import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PRODUTOS_TESTE_HTML = `<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td width="50%" style="padding:6px;vertical-align:top;"><div style="border:1px solid #e5e5e5;overflow:hidden;background:#fff;"><img src="https://placehold.co/300x380/111111/ffffff?text=LOUDER" alt="Camiseta LOUDER Dark" style="width:100%;display:block;" /><div style="padding:8px 10px;"><div style="font-size:12px;font-weight:700;color:#111;text-transform:uppercase;line-height:1.3;">CAMISETA LOUDER DARK</div><div style="font-size:11px;color:#888;margin-top:3px;">Tam: G • Qtd: 1</div><div style="font-size:13px;font-weight:700;color:#000;margin-top:4px;">R$ 129,90</div></div></div></td><td width="50%" style="padding:6px;vertical-align:top;"><div style="border:1px solid #e5e5e5;overflow:hidden;background:#fff;"><img src="https://placehold.co/300x380/1a1a1a/ffffff?text=LOUDER" alt="Moletom LOUDER Post-Punk" style="width:100%;display:block;" /><div style="padding:8px 10px;"><div style="font-size:12px;font-weight:700;color:#111;text-transform:uppercase;line-height:1.3;">MOLETOM LOUDER POST-PUNK</div><div style="font-size:11px;color:#888;margin-top:3px;">Cor: Preto • Qtd: 1</div><div style="font-size:13px;font-weight:700;color:#000;margin-top:4px;">R$ 249,90</div></div></div></td></tr></table>`;
const TOTAL_TESTE = "R$ 379,80";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateHtml: string;
  subject: string;
}

export function SendTestEmail({ open, onOpenChange, templateHtml, subject }: Props) {
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!testEmail) return;
    setSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const unsubUrl = `https://${projectId}.supabase.co/functions/v1/email-unsubscribe?email=${encodeURIComponent(testEmail)}`;

      const html = templateHtml
        .replace(/\{\{nome\}\}/gi, "Teste")
        .replace(/\{\{email\}\}/gi, testEmail)
        .replace(/\{\{unsubscribe_url\}\}/gi, unsubUrl)
        .replace(/\{\{recovery_url\}\}/gi, "https://louder.ink/checkout/exemplo")
        .replace(/\{\{total\}\}/gi, TOTAL_TESTE)
        .replace(/\{\{produtos\}\}/gi, PRODUTOS_TESTE_HTML);

      const renderedSubject = subject.replace(/\{\{nome\}\}/gi, "Teste");

      const { data, error } = await supabase.functions.invoke("send-brevo-email", {
        body: {
          action: "send",
          to: testEmail,
          subject: `[TESTE] ${renderedSubject}`,
          htmlContent: html,
          tags: ["email-marketing", "test"],
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar");

      setSent(true);
      toast.success(`Email de teste enviado para ${testEmail}`);
      setTimeout(() => {
        setSent(false);
        onOpenChange(false);
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar email de teste");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Email de Teste</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Envie um email de teste antes de lançar a campanha. O assunto será prefixado com [TESTE].
          </p>
          <Input
            type="email"
            placeholder="seu@email.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <div className="border rounded-lg overflow-hidden">
            <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">Preview</p>
            <iframe
              srcDoc={templateHtml
                .replace(/\{\{nome\}\}/gi, "Teste")
                .replace(/\{\{email\}\}/gi, testEmail || "email@teste.com")
                .replace(/\{\{unsubscribe_url\}\}/gi, "#")
                .replace(/\{\{recovery_url\}\}/gi, "https://louder.ink/checkout/exemplo")
                .replace(/\{\{total\}\}/gi, TOTAL_TESTE)
                .replace(/\{\{produtos\}\}/gi, PRODUTOS_TESTE_HTML)}
              className="w-full h-48 border-0"
              title="Test Preview"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!testEmail || sending || sent}
            className="w-full gap-2"
          >
            {sent ? (
              <><CheckCircle className="w-4 h-4" /> Enviado!</>
            ) : sending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="w-4 h-4" /> Enviar Teste</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
