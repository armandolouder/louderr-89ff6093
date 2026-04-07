import { useState, useEffect } from "react";
import { Mail, CheckCircle, XCircle, Send, Loader2, ExternalLink, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BrevoStatus {
  connected: boolean;
  senderName?: string;
  senderEmail?: string;
  error?: string;
}

interface BrevoConfigProps {
  status: BrevoStatus | null;
  onStatusChange: (status: BrevoStatus) => void;
}

interface CreditPlan {
  type: string;
  credits: number;
  planType: string;
}

export function BrevoConfig({ status, onStatusChange }: BrevoConfigProps) {
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [credits, setCredits] = useState<CreditPlan[] | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditsEmail, setCreditsEmail] = useState("");

  useEffect(() => {
    if (status?.connected) {
      checkCredits();
    }
  }, [status?.connected]);

  const checkCredits = async () => {
    setCreditsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-email", {
        body: { action: "check-credits" },
      });
      if (error) throw error;
      if (data?.success) {
        setCredits(data.plans || []);
        setCreditsEmail(data.email || "");
      }
    } catch {
      // silent fail
    } finally {
      setCreditsLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-email", {
        body: { action: "test-connection" },
      });
      if (error) throw error;
      if (data?.success) {
        onStatusChange({
          connected: true,
          senderName: data.senderName,
          senderEmail: data.senderEmail,
        });
        toast.success("Brevo conectada com sucesso!");
      } else {
        onStatusChange({ connected: false, error: data?.error || "Falha na conexão" });
        toast.error(data?.error || "Falha na conexão com Brevo");
      }
    } catch (err: any) {
      onStatusChange({ connected: false, error: err.message });
      toast.error("Erro ao testar conexão: " + err.message);
    } finally {
      setTesting(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Digite um e-mail para teste");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-email", {
        body: {
          action: "send",
          to: testEmail,
          subject: "🧪 Teste LOUDER.ink - Brevo",
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #000;">✅ Conexão Brevo Funcionando!</h1>
              <p>Este é um e-mail de teste enviado pela plataforma LOUDER.ink.</p>
              <p style="color: #666;">Se você está vendo este e-mail, a integração está configurada corretamente.</p>
            </div>
          `,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("E-mail de teste enviado!");
      } else {
        toast.error(data?.error || "Falha ao enviar e-mail");
      }
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const formatCreditType = (type: string) => {
    const map: Record<string, string> = {
      sendLimit: "Limite de Envio",
      credits: "Créditos",
    };
    return map[type] || type;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Brevo (Email Marketing)</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Envio de e-mails transacionais e de recuperação de carrinhos
        </p>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Status da Conexão
          </CardTitle>
          <CardDescription>Verifique se a API da Brevo está configurada</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {status?.connected ? (
              <>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" /> Conectada
                </Badge>
                {status.senderEmail && (
                  <span className="text-sm text-muted-foreground">
                    Remetente: {status.senderName || "N/A"} ({status.senderEmail})
                  </span>
                )}
              </>
            ) : (
              <Badge variant="outline" className="text-destructive border-destructive/30">
                <XCircle className="w-3 h-3 mr-1" /> Desconectada
              </Badge>
            )}
          </div>

          {status?.error && (
            <p className="text-sm text-destructive">{status.error}</p>
          )}

          <Button onClick={testConnection} disabled={testing} variant="outline">
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testando...
              </>
            ) : (
              "Testar Conexão"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Credits */}
      {status?.connected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Créditos da Conta
                </CardTitle>
                <CardDescription>
                  {creditsEmail ? `Conta: ${creditsEmail}` : "Saldo disponível para envio de e-mails"}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={checkCredits} disabled={creditsLoading}>
                <RefreshCw className={`w-4 h-4 ${creditsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {creditsLoading && !credits ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando créditos...
              </div>
            ) : credits && credits.length > 0 ? (
              <div className="grid gap-3">
                {credits.map((plan, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatCreditType(plan.type)}</p>
                      <p className="text-xs text-muted-foreground">{plan.planType}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${plan.credits > 50 ? "text-emerald-400" : plan.credits > 0 ? "text-amber-400" : "text-destructive"}`}>
                        {plan.credits.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground">restantes</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma informação de créditos disponível</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4" />
            Enviar E-mail de Teste
          </CardTitle>
          <CardDescription>Confirme que o envio está funcionando</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">E-mail do destinatário</Label>
            <div className="flex gap-2">
              <Input
                id="test-email"
                type="email"
                placeholder="seu@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button onClick={sendTestEmail} disabled={sending || !status?.connected}>
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground text-sm mb-2">Uso no Recovery Engine</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>E-mails de recuperação de carrinhos abandonados</li>
              <li>Templates dinâmicos com nome, produtos e link</li>
              <li>Suporte a A/B testing de assunto e conteúdo</li>
              <li>Tracking de abertura e cliques</li>
            </ul>
            <a
              href="https://developers.brevo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
            >
              Documentação Brevo <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
