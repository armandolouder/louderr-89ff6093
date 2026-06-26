import { useState, useEffect, useRef } from "react";
import { Copy, CheckCircle, ExternalLink, ShoppingBag, RefreshCw, Download, Loader2, Square, Link2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NuvemshopConfigProps {
  status: { connected: boolean; orderCount?: number; error?: string } | null;
  onStatusChange: (status: any) => void;
}

export function NuvemshopConfig({ status, onStatusChange }: NuvemshopConfigProps) {
  const [copied, setCopied] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [connection, setConnection] = useState<{ store_id: string; store_name: string | null; updated_at: string } | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ synced: 0, page: 0, status: "" });
  const abortRef = useRef(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nuvemshop-webhook`;
  const redirectUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nuvemshop-oauth-callback`;
  const appId = "17587";
  const installUrl = `https://www.nuvemshop.com.br/apps/${appId}/authorize`;

  const fetchConnection = async () => {
    try {
      const { data } = await (supabase as any)
        .from("nuvemshop_credentials")
        .select("store_id, store_name, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setConnection(data || null);
    } catch {
      setConnection(null);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRedirectUrl = () => {
    navigator.clipboard.writeText(redirectUrl);
    setCopiedRedirect(true);
    toast.success("URL de redirecionamento copiada!");
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  const fetchRecentOrders = async () => {
    setLoading(true);
    try {
      const { data, error, count } = await supabase
        .from("nuvemshop_orders" as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentOrders(data || []);
      onStatusChange({ connected: true, orderCount: count || 0 });
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      onStatusChange({ connected: false, orderCount: 0, error: err?.message || "Erro ao carregar pedidos" });
    } finally {
      setLoading(false);
    }
  };

  const stopSync = () => {
    abortRef.current = true;
    toast.info("Parando sincronização após a página atual...");
  };

  const syncOrders = async () => {
    setSyncing(true);
    abortRef.current = false;
    setSyncProgress({ synced: 0, page: 0, status: "Iniciando..." });
    try {
      let page = 1;
      let totalSynced = 0;
      let hasMore = true;

      while (hasMore && !abortRef.current) {
        setSyncProgress({ synced: totalSynced, page, status: `Importando página ${page}...` });

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nuvemshop-sync?page=${page}&per_page=50`,
          {
            headers: {
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Erro ao sincronizar");
        }

        const result = await response.json();
        totalSynced += result.synced || 0;
        hasMore = result.has_more || false;
        page++;

        setSyncProgress({ synced: totalSynced, page: page - 1, status: hasMore ? `${totalSynced} pedidos importados...` : "Concluído!" });

        if (page > 100) break;
      }

      if (abortRef.current) {
        toast.info(`Sincronização pausada. ${totalSynced} pedidos importados até agora.`);
      } else {
        toast.success(`${totalSynced} pedidos sincronizados!`);
      }
      fetchRecentOrders();
    } catch (err: any) {
      console.error("Sync error:", err);
      toast.error(err.message || "Erro ao sincronizar pedidos");
    } finally {
      setSyncing(false);
      abortRef.current = false;
    }
  };

  useEffect(() => {
    fetchRecentOrders();
    fetchConnection();
  }, []);

  const eventLabels: Record<string, string> = {
    "order/created": "Criado",
    "order/paid": "Pago",
    "order/packed": "Embalado",
    "order/fulfilled": "Enviado",
    "order/cancelled": "Cancelado",
  };

  const eventColors: Record<string, string> = {
    "order/created": "bg-blue-500/20 text-blue-400",
    "order/paid": "bg-green-500/20 text-green-400",
    "order/packed": "bg-yellow-500/20 text-yellow-400",
    "order/fulfilled": "bg-primary/20 text-primary",
    "order/cancelled": "bg-destructive/20 text-destructive",
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Nuvemshop</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Receba pedidos da sua loja Nuvemshop via webhook
        </p>
      </div>

      {/* Conexão OAuth */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Conexão da Loja (OAuth)
          </CardTitle>
          <CardDescription>
            Instale o app na sua loja para gerar um token de acesso válido automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection ? (
            <div className="flex items-center gap-2 text-sm text-foreground bg-primary/10 px-3 py-2 rounded-lg">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>
                Conectado{connection.store_name ? `: ${connection.store_name}` : ""} (ID {connection.store_id}) ·{" "}
                {new Date(connection.updated_at).toLocaleString("pt-BR")}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span>Loja não conectada. Instale o app para gerar o token.</span>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              1. Cole esta URL no campo <em>"URL de redirecionamento após instalação"</em> do seu app na Nuvemshop:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-secondary/50 text-sm px-3 py-2 rounded-lg text-foreground break-all">
                {redirectUrl}
              </code>
              <Button variant="outline" size="icon" onClick={copyRedirectUrl}>
                {copiedRedirect ? <CheckCircle className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No campo "Site do aplicativo" use: <code className="text-foreground">{window.location.origin}</code>
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">2. Depois de salvar, instale/reconecte o app:</p>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <a href={installUrl} target="_blank" rel="noopener noreferrer">
                  <Link2 className="w-4 h-4 mr-2" />
                  Instalar / Reconectar na Nuvemshop
                </a>
              </Button>
              <Button variant="outline" size="icon" onClick={fetchConnection}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ao autorizar, você volta com a mensagem "Conexão realizada". Clique em atualizar para confirmar o status aqui.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            URL do Webhook
          </CardTitle>
          <CardDescription>
            Configure esta URL nos webhooks da sua loja Nuvemshop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-secondary/50 text-sm px-3 py-2 rounded-lg text-foreground break-all">
              {webhookUrl}
            </code>
            <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
              {copied ? (
                <CheckCircle className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Eventos configurados:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eventLabels).map(([event, label]) => (
                <Badge key={event} variant="secondary" className="text-xs">
                  {event} → {label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground text-sm mb-2">Configuração da API</p>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <span className="font-medium text-foreground">Store URL:</span>
              <span>louderink4.lojavirtualnuvem.com.br</span>
              <span className="font-medium text-foreground">App ID:</span>
              <span>17587</span>
              <span className="font-medium text-foreground">Store ID:</span>
              <span>2778031</span>
              <span className="font-medium text-foreground">User Agent:</span>
              <span>LOUDER.ink (allvisualweb@gmail.com)</span>
              <span className="font-medium text-foreground">API Base URL:</span>
              <span>https://api.tiendanube.com/v1</span>
            </div>
            <a
              href="https://dev.nuvemshop.com.br/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
            >
              Documentação Nuvemshop <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Sync Orders from API */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4" />
            Sincronizar Pedidos
          </CardTitle>
          <CardDescription>
            Busque pedidos diretamente da API da Nuvemshop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button onClick={syncOrders} disabled={syncing} className="flex-1">
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Sincronizar Pedidos da API
                </>
              )}
            </Button>
            {syncing && (
              <Button variant="destructive" onClick={stopSync} size="icon">
                <Square className="w-4 h-4" />
              </Button>
            )}
          </div>

          {syncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{syncProgress.status}</span>
                <span>Página {syncProgress.page}</span>
              </div>
              <Progress value={syncProgress.page > 0 ? Math.min((syncProgress.page / 20) * 100, 95) : 0} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {syncProgress.synced} pedidos importados
              </p>
            </div>
          )}

          {!syncing && syncProgress.synced > 0 && (
            <p className="text-xs text-primary">
              ✓ Última sincronização: {syncProgress.synced} pedidos importados
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Busca pedidos da sua loja e salva no banco de dados. Você pode parar e retomar a qualquer momento.
          </p>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Pedidos Recentes</CardTitle>
              <CardDescription>
                {status?.orderCount ?? 0} pedidos recebidos
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRecentOrders} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum pedido recebido ainda. Configure o webhook na Nuvemshop para começar.
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        Pedido #{order.nuvemshop_order_id}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${eventColors[order.event] || "bg-secondary text-muted-foreground"}`}>
                        {eventLabels[order.event] || order.event}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.customer_name || "Cliente não identificado"} • R$ {Number(order.total || 0).toFixed(2)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
