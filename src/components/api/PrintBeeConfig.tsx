import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RefreshCw, Printer, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface PrintBeeStatus {
  connected: boolean;
  supplier?: string;
  error?: string;
}

interface PrintBeeConfigProps {
  status: PrintBeeStatus | null;
  onStatusChange: (status: PrintBeeStatus) => void;
}

export function PrintBeeConfig({ status, onStatusChange }: PrintBeeConfigProps) {
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("printbee-orders", { body: { action: "test-connection" } });
      if (error) {
        onStatusChange({ connected: false, error: error.message });
        toast.error("Falha na conexão com PrintBee");
      } else if (data?.connected) {
        onStatusChange({ connected: true, supplier: data.supplier || "PrintBee" });
        toast.success("PrintBee conectada com sucesso!");
      } else {
        onStatusChange({ connected: false, error: data?.error || "Falha" });
        toast.error("Falha na conexão: " + (data?.error || "Erro desconhecido"));
      }
    } catch {
      onStatusChange({ connected: false, error: "Erro de conexão" });
      toast.error("Erro ao testar conexão");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Printer className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">PrintBee</h2>
          <p className="text-sm text-muted-foreground">Fornecedor Print-on-Demand — Custos e rastreamento</p>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Status da Conexão</h3>
          {status?.connected ? (
            <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
              <CheckCircle className="w-3 h-3" /> Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <XCircle className="w-3 h-3" /> Desconectado
            </Badge>
          )}
        </div>

        {status?.error && (
          <p className="text-sm text-destructive">{status.error}</p>
        )}

        {status?.connected && (
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Fornecedor:</span> <span className="font-medium">{status.supplier || "PrintBee"}</span></p>
          </div>
        )}

        <Button onClick={testConnection} disabled={testing} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${testing ? "animate-spin" : ""}`} />
          Testar Conexão
        </Button>
      </div>

      {/* Info */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-foreground">Como funciona</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>A integração com a PrintBee permite:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Buscar automaticamente os <strong>custos de produção</strong> dos pedidos</li>
            <li>Exibir o <strong>fornecedor</strong> na tabela do Painel de Vendas</li>
            <li>Calcular o <strong>lucro líquido</strong> real (receita - custos)</li>
          </ul>
          <p className="text-xs mt-3">
            As credenciais (Client ID e Client Secret) já estão configuradas de forma segura no backend.
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <a
          href="https://printbee.com.br/development/api"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          Documentação da API PrintBee
        </a>
      </div>
    </div>
  );
}
