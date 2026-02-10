import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, RefreshCw, ShoppingCart, DollarSign, Receipt, Settings, Download, Trash2, Eye, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

const STATUS_OPTIONS = [
  { value: "all", label: "Todos..." },
  { value: "open", label: "Abertos" },
  { value: "closed", label: "Fechados" },
  { value: "cancelled", label: "Cancelados" },
];

const PAYMENT_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Pago", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  refunded: { label: "Reembolsado", variant: "destructive" },
  voided: { label: "Cancelado", variant: "destructive" },
  authorized: { label: "Autorizado", variant: "outline" },
};

const SHIPPING_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  shipped: { label: "Enviado", variant: "default" },
  unshipped: { label: "Não enviado", variant: "secondary" },
  delivered: { label: "Entregue", variant: "default" },
  unpacked: { label: "Não empacotado", variant: "outline" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function SalesDashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["sales-dashboard", month, year],
    queryFn: async () => {
      // Fetch orders filtering by order_date server-side
      // Use two queries: one for orders with order_date, one fallback for orders without
      const { data: dated, error: e1 } = await supabase
        .from("nuvemshop_orders")
        .select("*")
        .gte("order_date", startDate)
        .lte("order_date", endDate)
        .order("order_date", { ascending: false })
        .limit(1000);
      if (e1) throw e1;

      // Also fetch orders without order_date that were created in the period (legacy)
      const { data: legacy, error: e2 } = await supabase
        .from("nuvemshop_orders")
        .select("*")
        .is("order_date", null)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (e2) throw e2;

      return [...(dated || []), ...(legacy || [])];
    },
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (statusFilter === "all") return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const metrics = useMemo(() => {
    const list = filteredOrders;
    const totalRevenue = list.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = list.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalItems = list.reduce((sum, o) => {
      const products = o.products as any[];
      return sum + (Array.isArray(products) ? products.reduce((s, p) => s + (p.quantity || 1), 0) : 0);
    }, 0);
    return { totalRevenue, totalOrders, avgTicket, totalItems };
  }, [filteredOrders]);

  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    toast.info("Sincronizando pedidos...");
    try {
      let totalSynced = 0;
      let page = 1;
      let hasMore = true;

      const syncStart = new Date(year, month, 1).toISOString();
      const syncEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      while (hasMore) {
        const res = await supabase.functions.invoke(
          `nuvemshop-sync?page=${page}&per_page=50&created_at_min=${encodeURIComponent(syncStart)}&created_at_max=${encodeURIComponent(syncEnd)}`
        );
        if (res.error) throw res.error;
        totalSynced += res.data?.synced || 0;
        hasMore = res.data?.has_more || false;
        page++;
        if (page > 50) break;
      }

      toast.success(`Sincronização concluída: ${totalSynced} pedidos sincronizados`);
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] });
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + (err.message || "Erro desconhecido"));
    } finally {
      setSyncing(false);
    }
  };

  const handleClearData = async () => {
    const confirmed = window.confirm(
      "Tem certeza que deseja limpar TODOS os pedidos sincronizados? Você precisará sincronizar novamente."
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      const { error } = await supabase
        .from("nuvemshop_orders")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows
      if (error) throw error;
      toast.success("Todos os pedidos foram removidos. Sincronize novamente.");
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] });
    } catch (err: any) {
      toast.error("Erro ao limpar: " + (err.message || "Erro desconhecido"));
    } finally {
      setClearing(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="p-6 lg:p-8 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Vendas</h1>
            <p className="text-sm text-muted-foreground">Analise o desempenho financeiro da sua loja.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Configurações
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={handleClearData} disabled={clearing}>
            <Trash2 className="w-4 h-4" />
            Limpar
          </Button>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month.toString()} onValueChange={v => setMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year.toString()} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard label="Lucro Líquido (Real)" value={formatCurrency(metrics.totalRevenue)} color="text-success" />
          <MetricCard label="Faturamento Bruto" value={formatCurrency(metrics.totalRevenue)} color="text-primary" />
          <MetricCard label="Ticket Médio" value={formatCurrency(metrics.avgTicket)} color="text-accent" />
          <MetricCard label="Custos Produtos (CPV)" value={formatCurrency(0)} color="text-primary" />
          <MetricCard label="Outras Despesas" value={formatCurrency(0)} color="text-destructive" hasAction />
          <MetricCard
            label="Pedidos"
            value={`${metrics.totalOrders}`}
            icon={<ShoppingCart className="w-4 h-4 text-muted-foreground" />}
          />
          <MetricCard
            label="Itens Vendidos"
            value={`${metrics.totalItems}`}
            icon={<Receipt className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">Pedidos Detalhados</h2>
          <p className="text-sm text-muted-foreground">{filteredOrders.length} pedidos no período</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Nuvempago</TableHead>
                <TableHead className="text-right">Custos</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado no período selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map(order => {
                  const payment = PAYMENT_STATUS_MAP[order.payment_status || ""] || { label: order.payment_status || "—", variant: "outline" as const };
                  const statusLabel = order.status === "open" ? "Criado" : order.status === "closed" ? "Fechado" : order.status === "cancelled" ? "Cancelado" : order.status || "—";
                  const statusVariant = order.status === "cancelled" ? "destructive" : order.status === "closed" ? "default" : "outline";
                  const total = order.total || 0;
                  const products = order.products as any[];
                  const itemCount = Array.isArray(products) ? products.reduce((s, p) => s + (p.quantity || 1), 0) : 0;

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{(order as any).order_number || order.nuvemshop_order_id}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(order.order_date || order.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{(order.customer_name || "Consumidor").split(" ")[0]}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="text-right text-success font-medium">
                        {formatCurrency(0)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {(() => {
                          const method = (order as any).payment_method || "";
                          if (method === "pix") return "Pix";
                          if (method === "credit_card") return "Cartão";
                          if (method === "boleto") return "Boleto";
                          if (method === "debit_card") return "Débito";
                          return method || "—";
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const shipping = order.shipping_status || "";
                          const isPaid = order.payment_status === "paid";
                          if (shipping === "shipped") return <Badge className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30">Enviado</Badge>;
                          if (shipping === "delivered") return <Badge className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">Entregue</Badge>;
                          if (shipping === "unpacked" && isPaid) return <Badge className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">Pago</Badge>;
                          if (isPaid) return <Badge className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">Embalado</Badge>;
                          if (order.status === "cancelled") return <Badge variant="destructive" className="text-xs px-2 py-0.5">Cancelado</Badge>;
                          return <Badge variant="outline" className="text-xs px-2 py-0.5">{statusLabel}</Badge>;
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  color,
  icon,
  hasAction,
}: {
  label: string;
  value: string;
  suffix?: string;
  color?: string;
  icon?: React.ReactNode;
  hasAction?: boolean;
}) {
  return (
    <div className="stat-card rounded-lg p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {hasAction && <span className="text-muted-foreground text-lg cursor-pointer hover:text-foreground">+</span>}
      </div>
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-xl font-bold ${color || "text-foreground"}`}>{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
