import { useState } from "react";
import { Server, Key, RefreshCw, ExternalLink, CheckCircle, Wifi, WifiOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface UazapiConfigProps {
  status: InstanceStatus | null;
  onStatusChange: (status: InstanceStatus) => void;
}

export function UazapiConfig({ status, onStatusChange }: UazapiConfigProps) {
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-uazapi-status");

      if (error) {
        console.error("Error checking status:", error);
        onStatusChange({ connected: false, error: error.message });
        toast.error("Erro ao verificar status");
      } else if (data) {
        onStatusChange({
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
      onStatusChange({ connected: false, error: "Erro de conexão" });
      toast.error("Erro ao verificar status da instância");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">WhatsApp (UAZAPI)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure sua instância UAZAPI para envio e recebimento de mensagens via WhatsApp
          </p>
        </div>

        {/* Status Card */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
          {status?.connected ? (
            <>
              <Wifi className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Instância Conectada</p>
                <p className="text-sm text-muted-foreground">
                  {status.name && `${status.name}`}
                  {status.phoneNumber && ` • +${status.phoneNumber}`}
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
                  {status?.error || "Configure as credenciais abaixo"}
                </p>
              </div>
              <Badge variant="secondary">Offline</Badge>
            </>
          )}
        </div>

        <Separator />

        {/* Configuration Form */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Configuração da Instância</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server-url">Server URL</Label>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="server-url"
                  value={status?.serverUrl || ""}
                  readOnly
                  placeholder="https://api.uazapi.com"
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                URL do servidor UAZAPI (configurado via secrets)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instance-token">Token da Instância</Label>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="instance-token"
                  type="password"
                  value={status?.serverUrl ? "••••••••••••••••" : ""}
                  readOnly
                  placeholder="Não configurado"
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Token de autenticação da instância (configurado via secrets)
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Webhook Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Configuração do Webhook</h3>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2">URL do Webhook para configurar na UAZAPI:</p>
            <code className="text-xs bg-background px-2 py-1 rounded border border-border block overflow-x-auto">
              {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook
            </code>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={checkStatus}
            disabled={isChecking}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
            Testar Conexão
          </Button>
          <Button
            variant="outline"
            asChild
          >
            <a href="https://docs.uazapi.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentação
            </a>
          </Button>
        </div>

        {/* Info */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Para alterar as credenciais (UAZAPI_SERVER_URL e UAZAPI_INSTANCE_TOKEN), 
            acesse as configurações de secrets do backend através do Cloud View.
          </p>
        </div>
      </div>
    </div>
  );
}
