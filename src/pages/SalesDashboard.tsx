import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, RefreshCw, ShoppingCart, DollarSign, Receipt, Settings, Download } from "lucide-react";
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
      // Fetch all orders, then filter by order_date client-side
      // since order_date may be null for some records
      const { data, error } = await supabase
        .from("nuvemshop_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Filter by actual order date (from Nuvemshop), falling back to created_at
      return (data || []).filter(order => {
        const orderDate = order.order_date || order.created_at;
        return orderDate >= startDate && orderDate <= endDate;
      });
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

  const handleSync = async () => {
    toast.info("Sincronizando pedidos...");
    try {
      const { data, error } = await supabase.functions.invoke("nuvemshop-sync", {
        body: null,
      });
      if (error) throw error;
      toast.success(`Sincronização concluída: ${data?.synced || 0} pedidos`);
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] });
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + (err.message || "Erro desconhecido"));
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="p-6 lg:p-8 space-y-6">
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
          <Button variant="outline" size="sm" className="gap-2" onClick={handleSync}>
            <RefreshCw className="w-4 h-4" />
            Sincronizar
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
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
            label="Pedidos / Itens"
            value={`${metrics.totalOrders}`}
            suffix={`/ ${metrics.totalItems}`}
            icon={<ShoppingCart className="w-4 h-4 text-muted-foreground" />}
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
                <TableHead className="w-[100px]">Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Envio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado no período selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map(order => {
                  const payment = PAYMENT_STATUS_MAP[order.payment_status || ""] || { label: order.payment_status || "—", variant: "outline" as const };
                  const shipping = SHIPPING_STATUS_MAP[order.shipping_status || ""] || { label: order.shipping_status || "—", variant: "outline" as const };
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.nuvemshop_order_id}</TableCell>
                      <TableCell>{order.customer_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{order.customer_email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{order.customer_phone || "—"}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {order.total ? formatCurrency(order.total) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.variant}>{payment.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={shipping.variant}>{shipping.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === "cancelled" ? "destructive" : "outline"}>
                          {order.status || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(order.order_date || order.created_at).toLocaleDateString("pt-BR")}
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
