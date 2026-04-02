import { useState, useEffect, useRef } from "react";
import { Copy, CheckCircle, ExternalLink, ShoppingBag, RefreshCw, Download, Loader2, Square } from "lucide-react";
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
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ synced: 0, page: 0, status: "" });
  const abortRef = useRef(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nuvemshop-webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
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

  const syncOrders = async () => {
    setSyncing(true);
    try {
      let page = 1;
      let totalSynced = 0;
      let hasMore = true;

      while (hasMore) {
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

        if (page > 20) break; // Safety limit
      }

      toast.success(`${totalSynced} pedidos sincronizados!`);
      fetchRecentOrders();
    } catch (err: any) {
      console.error("Sync error:", err);
      toast.error(err.message || "Erro ao sincronizar pedidos");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchRecentOrders();
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
        <CardContent>
          <Button onClick={syncOrders} disabled={syncing} className="w-full">
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
          <p className="text-xs text-muted-foreground mt-2">
            Busca todos os pedidos da sua loja e salva no banco de dados.
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
