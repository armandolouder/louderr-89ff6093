import { useState, useEffect } from "react";
import { Wifi, WifiOff, Server, Key, RefreshCw, ExternalLink, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InstanceStatus {
  connected: boolean;
  serverUrl?: string;
  phoneNumber?: string;
  name?: string;
  status?: string;
  message?: string;
  error?: string;
}

export default function Settings() {
  const [instanceStatus, setInstanceStatus] = useState<InstanceStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check status on load
  useEffect(() => {
    checkInstanceStatus();
  }, []);

  const checkInstanceStatus = async () => {
    setIsCheckingStatus(true);
    try {
      // Call edge function to check UAZAPI status
      const { data, error } = await supabase.functions.invoke("check-uazapi-status");

      if (error) {
        console.error("Error checking status:", error);
        setInstanceStatus({ connected: false, error: error.message });
        toast.error("Erro ao verificar status");
      } else if (data) {
        setInstanceStatus({
          connected: data.connected,
          serverUrl: data.serverUrl,
          phoneNumber: data.phoneNumber,
          name: data.name,
          status: data.status,
          message: data.message,
          error: data.error,
        });
        
        if (data.connected) {
          toast.success("Instância conectada!");
        } else if (data.error) {
          toast.error(data.error);
        }
      }
    } catch (error) {
      console.error("Error checking instance status:", error);
      setInstanceStatus({ connected: false, error: "Erro de conexão" });
      toast.error("Erro ao verificar status da instância");
    } finally {
      setIsCheckingStatus(false);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações de integração</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Integração WhatsApp (UAZAPI)
          </CardTitle>
          <CardDescription>
            Status da conexão com sua instância UAZAPI para envio e recebimento de mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
            {instanceStatus?.connected ? (
              <>
                <Wifi className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Instância Conectada</p>
                  <p className="text-sm text-muted-foreground">
                    {instanceStatus.name && `${instanceStatus.name}`}
                    {instanceStatus.phoneNumber && ` • +${instanceStatus.phoneNumber}`}
                    {instanceStatus.message && ` • ${instanceStatus.message}`}
                  </p>
                </div>
                <Badge variant="default">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Instância Desconectada</p>
                  <p className="text-sm text-muted-foreground">
                    {instanceStatus?.error || "Verifique as configurações no backend"}
                  </p>
                </div>
                <Badge variant="secondary">Offline</Badge>
              </>
            )}
          </div>

          <Separator />

          {/* Configuration Display */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Server className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Server URL</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {instanceStatus?.serverUrl || "Não configurado"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Key className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Token da Instância</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {instanceStatus?.serverUrl ? "••••••••••••••••" : "Não configurado"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={checkInstanceStatus}
              disabled={isCheckingStatus}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isCheckingStatus ? "animate-spin" : ""}`} />
              Verificar Conexão
            </Button>
            <Button
              variant="ghost"
              asChild
            >
              <a href="https://docs.uazapi.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Documentação UAZAPI
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • As credenciais (UAZAPI_SERVER_URL e UAZAPI_INSTANCE_TOKEN) são armazenadas de forma segura nos secrets do backend.
          </p>
          <p>
            • Para alterar as credenciais, acesse o painel de configurações do backend (Cloud View).
          </p>
          <p>
            • O webhook da UAZAPI deve apontar para a Edge Function: <code className="text-xs bg-secondary px-1 py-0.5 rounded">/functions/v1/whatsapp-webhook</code>
          </p>
          <p>
            • Para obter suas credenciais, acesse o painel de administração da UAZAPI.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
