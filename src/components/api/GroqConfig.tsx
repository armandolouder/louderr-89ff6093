import { useState } from "react";
import { Brain, Key, RefreshCw, ExternalLink, CheckCircle, Sparkles, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GroqStatus {
  connected: boolean;
  model?: string;
  error?: string;
}

interface GroqConfigProps {
  status: GroqStatus | null;
  onStatusChange: (status: GroqStatus) => void;
}

export function GroqConfig({ status, onStatusChange }: GroqConfigProps) {
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("groq-chat", {
        body: {
          messages: [{ role: "user", content: "ping" }],
          model: "llama-3.3-70b-versatile",
          max_tokens: 5,
        },
      });

      if (error) {
        console.error("Error checking Groq status:", error);
        onStatusChange({ connected: false, error: error.message });
      } else if (data?.error) {
        onStatusChange({ connected: false, error: data.error });
      } else if (data?.choices) {
        onStatusChange({ connected: true, model: data.model });
        toast.success("Groq Cloud AI conectado!");
      } else {
        onStatusChange({ connected: false, error: "Resposta inesperada" });
      }
    } catch (error) {
      console.error("Error checking Groq status:", error);
      onStatusChange({ connected: false, error: "Erro de conexão" });
    } finally {
      setIsChecking(false);
    }
  };

  const availableModels = [
    { name: "Llama 3.3 70B Versatile", id: "llama-3.3-70b-versatile", description: "Modelo mais capaz, ideal para tarefas complexas" },
    { name: "Llama 3.1 8B Instant", id: "llama-3.1-8b-instant", description: "Rápido e eficiente para respostas simples" },
    { name: "Mixtral 8x7B", id: "mixtral-8x7b-32768", description: "Ótimo equilíbrio entre velocidade e qualidade" },
  ];

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">Groq Cloud AI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inteligência artificial para automação de mensagens e atendimento inteligente
          </p>
        </div>

        {/* Status Card */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
          {status?.connected ? (
            <>
              <Sparkles className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">API Conectada</p>
                <p className="text-sm text-muted-foreground">
                  Modelo ativo: {status.model || "llama-3.3-70b-versatile"}
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
                <p className="font-medium text-foreground">API Desconectada</p>
                <p className="text-sm text-muted-foreground">
                  {status?.error || "Configure a API Key abaixo"}
                </p>
              </div>
              <Badge variant="secondary">Offline</Badge>
            </>
          )}
        </div>

        <Separator />

        {/* Configuration Form */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Configuração da API</h3>
          
          <div className="space-y-2">
            <Label htmlFor="groq-api-key">API Key</Label>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-muted-foreground" />
              <Input
                id="groq-api-key"
                type="password"
                value={status?.connected ? "••••••••••••••••" : ""}
                readOnly
                placeholder="Não configurada"
                className="font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Chave de API do Groq Cloud (configurado via secrets)
            </p>
          </div>
        </div>

        <Separator />

        {/* Available Models */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Modelos Disponíveis</h3>
          <div className="space-y-2">
            {availableModels.map((model) => (
              <div
                key={model.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border"
              >
                <Brain className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{model.name}</p>
                  <p className="text-xs text-muted-foreground">{model.description}</p>
                </div>
                {status?.model === model.id && (
                  <Badge variant="secondary" className="text-xs">Ativo</Badge>
                )}
              </div>
            ))}
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
            <a href="https://console.groq.com/docs" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentação
            </a>
          </Button>
        </div>

        {/* Info */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Para configurar ou alterar a GROQ_API_KEY, 
            acesse as configurações de secrets do backend através do Cloud View.
          </p>
        </div>
      </div>
    </div>
  );
}
