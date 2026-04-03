import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
        .replace(/\{\{unsubscribe_url\}\}/gi, unsubUrl);

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
                .replace(/\{\{unsubscribe_url\}\}/gi, "#")}
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
