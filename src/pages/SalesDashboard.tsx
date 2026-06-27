import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, RefreshCw, ShoppingCart, Trash2, Eye, Send, Printer, Pencil, Check, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const SUPPLIERS = ["PrintBee"];

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
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data: orderDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ["order-details", selectedOrder?.nuvemshop_order_id],
    enabled: !!selectedOrder?.nuvemshop_order_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-order-details", {
        body: { orderId: selectedOrder.nuvemshop_order_id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar pedido");
      return data.details as any;
    },
  });

  // Payment fee config per method (Nuvem Pago) — stored in bot_settings (key='payment_fees')
  // Defaults: cartão 4,19% + R$0,35 / Pix 0,99% / Boleto R$2,39
  const DEFAULT_FEES = {
    credit_card: { percentage: 4.19, fixed_fee: 0.35 },
    pix: { percentage: 0.99, fixed_fee: 0 },
    boleto: { percentage: 0, fixed_fee: 2.39 },
  } as const;

  type FeeMethod = "credit_card" | "pix" | "boleto";
  type FeeConfig = Record<FeeMethod, { percentage: number; fixed_fee: number }>;

  const { data: feeSettings } = useQuery({
    queryKey: ["payment-fees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bot_settings")
        .select("id, value")
        .eq("key", "payment_fees")
        .maybeSingle();
      const v = (data?.value as any) || {};
      const methods: FeeConfig = {
        credit_card: {
          percentage: Number(v.credit_card?.percentage ?? v.percentage ?? DEFAULT_FEES.credit_card.percentage),
          fixed_fee: Number(v.credit_card?.fixed_fee ?? v.fixed_fee ?? DEFAULT_FEES.credit_card.fixed_fee),
        },
        pix: {
          percentage: Number(v.pix?.percentage ?? DEFAULT_FEES.pix.percentage),
          fixed_fee: Number(v.pix?.fixed_fee ?? DEFAULT_FEES.pix.fixed_fee),
        },
        boleto: {
          percentage: Number(v.boleto?.percentage ?? DEFAULT_FEES.boleto.percentage),
          fixed_fee: Number(v.boleto?.fixed_fee ?? DEFAULT_FEES.boleto.fixed_fee),
        },
      };
      return { id: data?.id as string | undefined, methods };
    },
  });

  // Normalize various method strings from Nuvemshop API to our 3 buckets
  const normalizeMethod = (raw?: string | null): FeeMethod => {
    const m = (raw || "").toLowerCase();
    if (m.includes("pix")) return "pix";
    if (m.includes("boleto") || m.includes("ticket")) return "boleto";
    return "credit_card"; // default: cartão (também cobre 'credit_card', 'debit_card', etc.)
  };

  const calcFee = (total: number, method?: string | null) => {
    if (!total || total <= 0) return 0;
    const cfg = feeSettings?.methods || (DEFAULT_FEES as unknown as FeeConfig);
    const key = normalizeMethod(method);
    const f = cfg[key];
    return total * (f.percentage / 100) + f.fixed_fee;
  };

  const [feeDraft, setFeeDraft] = useState<Record<FeeMethod, { pct: string; fixed: string }>>({
    credit_card: { pct: "", fixed: "" },
    pix: { pct: "", fixed: "" },
    boleto: { pct: "", fixed: "" },
  });
  useEffect(() => {
    if (feeSettings?.methods) {
      setFeeDraft({
        credit_card: { pct: String(feeSettings.methods.credit_card.percentage), fixed: String(feeSettings.methods.credit_card.fixed_fee) },
        pix: { pct: String(feeSettings.methods.pix.percentage), fixed: String(feeSettings.methods.pix.fixed_fee) },
        boleto: { pct: String(feeSettings.methods.boleto.percentage), fixed: String(feeSettings.methods.boleto.fixed_fee) },
      });
    }
  }, [feeSettings?.methods]);

  const saveFees = useMutation({
    mutationFn: async () => {
      const parse = (s: string) => parseFloat(String(s).replace(",", ".")) || 0;
      const payload = {
        credit_card: { percentage: parse(feeDraft.credit_card.pct), fixed_fee: parse(feeDraft.credit_card.fixed) },
        pix: { percentage: parse(feeDraft.pix.pct), fixed_fee: parse(feeDraft.pix.fixed) },
        boleto: { percentage: parse(feeDraft.boleto.pct), fixed_fee: parse(feeDraft.boleto.fixed) },
      };
      if (feeSettings?.id) {
        const { error } = await supabase.from("bot_settings").update({ value: payload }).eq("id", feeSettings.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("bot_settings").insert({ key: "payment_fees", value: payload, user_id: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Taxas salvas");
      queryClient.invalidateQueries({ queryKey: ["payment-fees"] });
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + (e.message || "")),
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["sales-dashboard", month, year, searchQuery],
    queryFn: async () => {
      const q = searchQuery.trim().replace(/^#/, "");

      // Global search by order number/id — ignores period and status filters
      if (q) {
        const { data, error } = await supabase
          .from("nuvemshop_orders")
          .select("*")
          .or(`order_number.ilike.%${q}%,nuvemshop_order_id.ilike.%${q}%`)
          .order("order_date", { ascending: false, nullsFirst: false })
          .limit(200);
        if (error) throw error;
        return data || [];
      }

      const { data: dated, error: e1 } = await supabase
        .from("nuvemshop_orders")
        .select("*")
        .gte("order_date", startDate)
        .lte("order_date", endDate)
        .not("status", "in", '("cancelled","closed")')
        .order("order_date", { ascending: false })
        .limit(1000);
      if (e1) throw e1;

      const { data: legacy, error: e2 } = await supabase
        .from("nuvemshop_orders")
        .select("*")
        .is("order_date", null)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .not("status", "in", '("cancelled","closed")')
        .order("created_at", { ascending: false })
        .limit(1000);
      if (e2) throw e2;

      return [...(dated || []), ...(legacy || [])];
    },
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    // When searching, return raw results (already filtered server-side, ignore period/status)
    if (searchQuery.trim()) return orders;
    let result = orders;
    if (statusFilter !== "all") {
      result = result.filter(o => o.status === statusFilter);
    }
    return result;
  }, [orders, statusFilter, searchQuery]);

  useEffect(() => {
    if (!selectedOrder?.id || !orders) return;
    const refreshedOrder = orders.find((order) => order.id === selectedOrder.id);
    if (refreshedOrder) {
      setSelectedOrder(refreshedOrder);
    }
  }, [orders, selectedOrder?.id]);

  const metrics = useMemo(() => {
    const billable = filteredOrders.filter(o => o.status !== "cancelled" && o.payment_status === "paid");
    const totalRevenueGross = billable.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalFees = billable.reduce((sum, o) => sum + calcFee(o.total || 0, (o as any).payment_method), 0);
    const totalRevenue = totalRevenueGross - totalFees; // líquido após taxas (faturamento líquido)
    const totalOrders = billable.length;
    const avgTicket = totalOrders > 0 ? totalRevenueGross / totalOrders : 0;
    const totalItems = billable.reduce((sum, o) => {
      const products = o.products as any[];
      return sum + (Array.isArray(products) ? products.reduce((s, p) => s + (p.quantity || 1), 0) : 0);
    }, 0);
    
    // Calculate total costs from manual entries
    const totalCosts = billable.reduce((sum, o) => {
      return sum + ((o as any).production_cost || 0);
    }, 0);
    
    const netProfit = totalRevenueGross - totalFees - totalCosts;
    
    return { totalRevenue: totalRevenueGross, totalRevenueNet: totalRevenue, totalFees, totalOrders, avgTicket, totalItems, totalCosts, netProfit };
  }, [filteredOrders, feeSettings?.methods]);

  type EditableOrderField = "supplier" | "production_cost" | "paid_to_supplier";

  const updateOrderField = useMutation({
    mutationFn: async ({ orderId, field, value }: { orderId: string; field: EditableOrderField; value: string | number | boolean | null }) => {
      let payload: any;
      if (field === "supplier") {
        payload = { supplier: typeof value === "string" ? value.trim() || null : null };
      } else if (field === "production_cost") {
        payload = { production_cost: typeof value === "number" ? value : null };
      } else {
        payload = { paid_to_supplier: !!value };
      }

      const { data, error } = await supabase
        .from("nuvemshop_orders")
        .update(payload as any)
        .eq("id", orderId)
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ orderId, field, value }) => {
      await queryClient.cancelQueries({ queryKey: ["sales-dashboard", month, year] });
      const previousOrders = queryClient.getQueryData(["sales-dashboard", month, year]);
      queryClient.setQueryData(["sales-dashboard", month, year], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((order: any) =>
          order.id === orderId ? { ...order, [field]: value } : order
        );
      });
      return { previousOrders };
    },
    onSuccess: (updatedOrder) => {
      if (selectedOrder?.id === updatedOrder.id) {
        setSelectedOrder(updatedOrder);
      }
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(["sales-dashboard", month, year], context.previousOrders);
      }
      toast.error("Erro ao salvar: " + (err.message || "Erro desconhecido"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard", month, year] });
    },
  });


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
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nº do pedido"
              className="h-9 w-[180px] pl-8"
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={handleSync} disabled={syncing} title="Sincronizar">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full text-destructive hover:text-destructive" onClick={handleClearData} disabled={clearing} title="Limpar dados">
            <Trash2 className="w-4 h-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" title="Configurar taxas do gateway">
                <Settings className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-4" align="end">
              <div>
                <h4 className="text-sm font-semibold">Taxas por Método de Pagamento</h4>
                <p className="text-xs text-muted-foreground">Aplicadas automaticamente conforme o método de cada pedido pago.</p>
              </div>
              {([
                { key: "credit_card" as const, label: "Cartão de Crédito" },
                { key: "pix" as const, label: "Pix" },
                { key: "boleto" as const, label: "Boleto" },
              ]).map(({ key, label }) => (
                <div key={key} className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
                  <div className="text-xs font-semibold text-foreground">{label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">% sobre venda</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={feeDraft[key].pct}
                        onChange={(e) => setFeeDraft(p => ({ ...p, [key]: { ...p[key], pct: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Fixo (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={feeDraft[key].fixed}
                        onChange={(e) => setFeeDraft(p => ({ ...p, [key]: { ...p[key], fixed: e.target.value } }))}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button size="sm" className="w-full" onClick={() => saveFees.mutate()} disabled={saveFees.isPending}>
                Salvar
              </Button>
            </PopoverContent>
          </Popover>

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
          <MetricCard label="Lucro Líquido (Real)" value={formatCurrency(metrics.netProfit)} color="text-primary" />
          <MetricCard label="Faturamento Bruto" value={formatCurrency(metrics.totalRevenue)} color="text-foreground" />
          <MetricCard label="Ticket Médio" value={formatCurrency(metrics.avgTicket)} color="text-accent" />
          <MetricCard label="Custos Produtos (CPV)" value={formatCurrency(metrics.totalCosts)} color="text-destructive" />
          <MetricCard label="Taxas Gateway" value={formatCurrency(metrics.totalFees)} color="text-destructive" />
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
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[110px]">Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Nuvempago</TableHead>
                <TableHead className="text-right">Taxas</TableHead>
                <TableHead className="text-right">Custos</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
                  
                  const supplierName = (order as any).supplier || "";
                  const cost = (order as any).production_cost || 0;
                  const fee = order.payment_status === "paid" ? calcFee(total, (order as any).payment_method) : 0;
                  const net = total - fee - cost;
                  const isPaid = !!(order as any).paid_to_supplier;

                  return (
                    <TableRow key={order.id} className={isPaid ? "bg-emerald-500/10 hover:bg-emerald-500/15" : ""}>
                      <TableCell className="w-[40px]">
                        <Checkbox
                          checked={isPaid}
                          onCheckedChange={(checked) =>
                            updateOrderField.mutate({ orderId: order.id, field: "paid_to_supplier", value: !!checked })
                          }
                          aria-label="Marcar como pago ao fornecedor"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{(order as any).order_number || order.nuvemshop_order_id}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(order.order_date || order.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{(order.customer_name || "Consumidor").split(" ")[0]}</span>
                      </TableCell>
                      <TableCell>
                        <InlineSupplierEditor
                          value={supplierName}
                          onSave={(val) => updateOrderField.mutate({ orderId: order.id, field: "supplier", value: val || null })}
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {fee > 0 ? `-${formatCurrency(fee)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        <InlineCostEditor
                          value={cost}
                          onSave={(val) => updateOrderField.mutate({ orderId: order.id, field: "production_cost", value: val })}
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(net)}
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
                        <div className="flex items-center justify-center gap-1">
                          {order.customer_phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Enviar WhatsApp individual"
                              onClick={() => {
                                const firstName = (order.customer_name || "Cliente").split(" ")[0];
                                const prods = Array.isArray(order.products) ? (order.products as any[]).map((p: any) => `• ${p.name || "Produto"}`).join("\n") : "";
                                const totalStr = order.total ? `R$ ${Number(order.total).toFixed(2).replace(".", ",")}` : "";
                                const msg = `Olá ${firstName}! 👋\nObrigado pelo seu pedido${totalStr ? ` de ${totalStr}` : ""}!\n${prods ? `\n${prods}\n` : ""}\nPrecisa de alguma ajuda?`;
                                navigate(`/campaigns?tab=individual&phone=${encodeURIComponent(order.customer_phone!)}&msg=${encodeURIComponent(msg)}`);
                              }}
                            >
                              <Send className="w-4 h-4 text-emerald-500" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrder(order)}>
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pedido #{selectedOrder?.order_number || selectedOrder?.nuvemshop_order_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Cliente</span>
              <span>{selectedOrder?.customer_name || "—"}</span>
              <span className="text-muted-foreground">Data</span>
              <span>{selectedOrder ? new Date(selectedOrder.order_date || selectedOrder.created_at).toLocaleDateString("pt-BR") : ""}</span>
              <span className="text-muted-foreground">Fornecedor</span>
              <span>{selectedOrder?.supplier || "—"}</span>
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{selectedOrder ? formatCurrency(selectedOrder.total || 0) : ""}</span>
              <span className="text-muted-foreground">Método</span>
              <span className="capitalize">
                {(() => {
                  const m = (selectedOrder as any)?.payment_method?.toLowerCase() || "";
                  if (m.includes("pix")) return "Pix";
                  if (m.includes("boleto")) return "Boleto";
                  if (m.includes("credit")) return "Cartão de Crédito";
                  if (m.includes("debit")) return "Cartão de Débito";
                  return m || "—";
                })()}
              </span>
              <span className="text-muted-foreground">Taxas Gateway</span>
              <span className="text-destructive">
                {selectedOrder && selectedOrder.payment_status === "paid"
                  ? `-${formatCurrency(calcFee(selectedOrder.total || 0, (selectedOrder as any).payment_method))}`
                  : "—"}
              </span>
              <span className="text-muted-foreground">Custo</span>
              <span>{selectedOrder ? formatCurrency(selectedOrder.production_cost || 0) : "—"}</span>
              <span className="text-muted-foreground">Líquido</span>
              <span className="font-bold text-primary">
                {selectedOrder
                  ? formatCurrency(
                      (selectedOrder.total || 0)
                      - (selectedOrder.payment_status === "paid" ? calcFee(selectedOrder.total || 0, (selectedOrder as any).payment_method) : 0)
                      - (selectedOrder.production_cost || 0)
                    )
                  : ""}
              </span>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Produtos</h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center w-[60px]">Qtd</TableHead>
                      <TableHead className="text-right w-[100px]">Preço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedOrder?.products as any[] || []).map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{p.name || "—"}</TableCell>
                        <TableCell className="text-center">{p.quantity || 1}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(p.price) || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {selectedOrder?.customer_phone && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  const firstName = (selectedOrder.customer_name || "Cliente").split(" ")[0];
                  const prods = Array.isArray(selectedOrder.products) ? (selectedOrder.products as any[]).map((p: any) => `• ${p.name || "Produto"}`).join("\n") : "";
                  const totalStr = selectedOrder.total ? `R$ ${Number(selectedOrder.total).toFixed(2).replace(".", ",")}` : "";
                  const msg = `Olá ${firstName}! 👋\nObrigado pelo seu pedido${totalStr ? ` de ${totalStr}` : ""}!\n${prods ? `\n${prods}\n` : ""}\nPrecisa de alguma ajuda?`;
                  navigate(`/campaigns?tab=individual&phone=${encodeURIComponent(selectedOrder.customer_phone!)}&msg=${encodeURIComponent(msg)}`);
                  setSelectedOrder(null);
                }}
              >
                <Send className="w-4 h-4 mr-2 text-emerald-500" />
                Enviar WhatsApp Individual
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InlineSupplierEditor({ value, onSave }: { value: string; onSave: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setCustom(SUPPLIERS.includes(value) ? "" : value);
    }
    setOpen(isOpen);
  };

  const handleSelect = (supplier: string) => {
    const nextSupplier = supplier.trim();
    if (!nextSupplier) {
      toast.error("Informe um fornecedor válido");
      return;
    }

    if (nextSupplier.length > 80) {
      toast.error("Fornecedor muito longo");
      return;
    }

    onSave(nextSupplier);
    setCustom("");
    setOpen(false);
    toast.success("Fornecedor salvo!");
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-sm hover:text-primary transition-colors cursor-pointer group">
          {value ? (
            <Badge variant="outline" className="gap-1 text-xs">
              <Printer className="w-3 h-3" />
              {value}
            </Badge>
          ) : (
            <span className="text-muted-foreground group-hover:text-primary">
              <Pencil className="w-3.5 h-3.5 inline mr-1" />
              add
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 space-y-2" align="start">
        {SUPPLIERS.map((s) => (
          <button
            key={s}
            className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-accent transition-colors"
            onClick={() => handleSelect(s)}
          >
            {s}
          </button>
        ))}
        <div className="space-y-1 pt-2 border-t">
          <label className="text-xs text-muted-foreground">Outro fornecedor</label>
          <div className="flex gap-1">
            <Input
              placeholder="Digite o nome"
              className="h-8 text-sm"
              maxLength={80}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSelect(custom);
                }
              }}
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={!custom.trim()}
              onClick={() => handleSelect(custom)}
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {value && (
          <button
            className="w-full text-left px-3 py-1 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => {
              onSave("");
              setCustom("");
              setOpen(false);
              toast.success("Fornecedor removido!");
            }}
          >
            Remover
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function InlineCostEditor({ value, onSave }: { value: number; onSave: (val: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setInput(value > 0 ? value.toString() : "");
    setOpen(isOpen);
  };

  const handleSave = () => {
    const parsed = parseFloat(input.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) {
      onSave(parsed);
      setOpen(false);
      toast.success("Custo salvo!");
    } else {
      toast.error("Valor inválido");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center justify-end gap-1 text-sm hover:text-primary transition-colors cursor-pointer group w-full">
          {value > 0 ? (
            <span className="text-destructive font-medium">{formatCurrency(value)}</span>
          ) : (
            <span className="text-muted-foreground group-hover:text-primary">
              <Pencil className="w-3.5 h-3.5 inline mr-1" />
              add
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Custo (R$)</label>
          <div className="flex gap-1">
            <Input
              placeholder="0,00"
              className="h-8 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSave}>
              <Check className="w-4 h-4 text-primary" />
            </Button>
          </div>
          {value > 0 && (
            <button
              className="w-full text-left px-2 py-1 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => { onSave(null); setOpen(false); toast.success("Custo removido!"); }}
            >
              Remover custo
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
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
