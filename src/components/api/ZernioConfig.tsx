import { useState, useEffect } from "react";
import { Copy, CheckCircle, ExternalLink, Instagram, RefreshCw, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ZernioAccount {
  accountId: string;
  username: string | null;
  profileId?: string | null;
}

interface SavedAccount {
  account_id: string;
  username: string | null;
  connected: boolean;
}

export function ZernioConfig() {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ZernioAccount[]>([]);
  const [saved, setSaved] = useState<SavedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zernio-webhook`;
  const connected = saved.some((s) => s.connected);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const loadStatus = async (action: "status" | "select" = "status", accountId?: string) => {
    if (action === "select") setConnecting(accountId ?? null);
    else setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("zernio-config", {
        body: { action, accountId },
      });
      if (fnError) throw fnError;
      if (!data?.success) {
        setError(data?.error || "Falha ao conectar à Zernio");
        setAccounts(data?.accounts ?? []);
        return;
      }
      setAccounts(data.accounts ?? []);
      setSaved(data.savedAccounts ?? []);
      if (action === "select") toast.success("Conta conectada!");
    } catch (err: any) {
      console.error("Zernio config error:", err);
      setError(err?.message || "Erro de conexão");
    } finally {
      setLoading(false);
      setConnecting(null);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Instagram DM (Zernio)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Receba e envie mensagens diretas do Instagram via Zernio
          </p>
        </div>
        <Badge variant={connected ? "default" : "secondary"}>
          {connected ? "Conectado" : "Desconectado"}
        </Badge>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Connected accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                Contas do Instagram
              </CardTitle>
              <CardDescription>
                Selecione a conta conectada na Zernio para sincronizar os DMs
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadStatus()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando contas...
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma conta do Instagram encontrada na Zernio. Conecte uma conta Business/Creator
              no painel da Zernio primeiro.
            </div>
          ) : (
            accounts.map((acc) => {
              const isSaved = saved.some((s) => s.account_id === acc.accountId && s.connected);
              return (
                <div
                  key={acc.accountId}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      @{acc.username || acc.accountId}
                    </p>
                    <p className="text-xs text-muted-foreground">{acc.accountId}</p>
                  </div>
                  {isSaved ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="w-3 h-3" /> Conectada
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => loadStatus("select", acc.accountId)}
                      disabled={connecting === acc.accountId}
                    >
                      {connecting === acc.accountId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 mr-1" /> Conectar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">URL do Webhook</CardTitle>
          <CardDescription>
            Configure esta URL nos webhooks da Zernio (eventos de mensagens) para receber DMs em
            tempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-secondary/50 text-sm px-3 py-2 rounded-lg text-foreground break-all">
              {webhookUrl}
            </code>
            <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
              {copied ? <CheckCircle className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {["message.received", "message.sent", "message.read"].map((e) => (
              <Badge key={e} variant="secondary" className="text-xs">
                {e}
              </Badge>
            ))}
          </div>
          <a
            href="https://docs.zernio.com/platforms/instagram"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
          >
            Documentação Zernio <ExternalLink className="w-3 h-3" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}