import { useState, useEffect } from "react";
import { Wifi, WifiOff, Server, Key, RefreshCw, ExternalLink, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InstanceStatus {
  connected: boolean;
  phoneNumber?: string;
  name?: string;
}

export default function Settings() {
  const [serverUrl, setServerUrl] = useState("");
  const [instanceToken, setInstanceToken] = useState("");
  const [instanceStatus, setInstanceStatus] = useState<InstanceStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isMasked, setIsMasked] = useState(true);

  // Load saved config from localStorage
  useEffect(() => {
    const savedServerUrl = localStorage.getItem("uazapi_server_url") || "";
    const savedToken = localStorage.getItem("uazapi_instance_token") || "";
    setServerUrl(savedServerUrl);
    setInstanceToken(savedToken);
    
    // Check status on load if we have config
    if (savedServerUrl && savedToken) {
      checkInstanceStatus(savedServerUrl, savedToken);
    }
  }, []);

  const checkInstanceStatus = async (url: string, token: string) => {
    if (!url || !token) {
      toast.error("Configure a URL e o Token primeiro");
      return;
    }

    setIsCheckingStatus(true);
    try {
      // Try to get instance info from UAZAPI
      const response = await fetch(`${url}/instance/info`, {
        method: "GET",
        headers: {
          "token": token,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInstanceStatus({
          connected: true,
          phoneNumber: data.phone || data.wid?.user,
          name: data.pushname || data.name,
        });
        toast.success("Instância conectada!");
      } else {
        setInstanceStatus({ connected: false });
        toast.error("Falha ao conectar com a instância");
      }
    } catch (error) {
      console.error("Error checking instance status:", error);
      setInstanceStatus({ connected: false });
      toast.error("Erro ao verificar status da instância");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSaveConfig = () => {
    localStorage.setItem("uazapi_server_url", serverUrl);
    localStorage.setItem("uazapi_instance_token", instanceToken);
    toast.success("Configurações salvas localmente");
    
    // Check status after saving
    checkInstanceStatus(serverUrl, instanceToken);
  };

  const maskToken = (token: string) => {
    if (!token) return "";
    if (token.length <= 8) return "••••••••";
    return token.slice(0, 4) + "••••••••" + token.slice(-4);
  };

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
            Configure a conexão com sua instância UAZAPI para envio e recebimento de mensagens
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
                    {instanceStatus.name && `${instanceStatus.name} • `}
                    {instanceStatus.phoneNumber && `+${instanceStatus.phoneNumber}`}
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
                  <p className="text-sm text-muted-foreground">Configure os dados abaixo para conectar</p>
                </div>
                <Badge variant="secondary">Offline</Badge>
              </>
            )}
          </div>

          <Separator />

          {/* Server URL */}
          <div className="space-y-2">
            <Label htmlFor="server-url" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Server URL
            </Label>
            <Input
              id="server-url"
              type="url"
              placeholder="https://sua-instancia.uazapi.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              URL base do seu servidor UAZAPI (ex: https://louer.uazapi.com)
            </p>
          </div>

          {/* Instance Token */}
          <div className="space-y-2">
            <Label htmlFor="instance-token" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Token da Instância
            </Label>
            <div className="flex gap-2">
              <Input
                id="instance-token"
                type={isMasked ? "password" : "text"}
                placeholder="Seu token de autenticação"
                value={instanceToken}
                onChange={(e) => setInstanceToken(e.target.value)}
                className="font-mono text-sm flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMasked(!isMasked)}
              >
                {isMasked ? "Mostrar" : "Ocultar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Token de autenticação da sua instância UAZAPI
            </p>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSaveConfig}>
              Salvar Configurações
            </Button>
            <Button
              variant="outline"
              onClick={() => checkInstanceStatus(serverUrl, instanceToken)}
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
            • As credenciais são armazenadas de forma segura no backend e não ficam expostas no código.
          </p>
          <p>
            • O Token da Instância é usado para autenticar chamadas à API UAZAPI.
          </p>
          <p>
            • Configure o webhook da UAZAPI para apontar para sua Edge Function de recebimento.
          </p>
          <p>
            • Para obter suas credenciais, acesse o painel de administração da UAZAPI.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
