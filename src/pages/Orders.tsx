import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, RefreshCw, Search, Filter, Eye, Send, ChevronDown,
  Phone, Mail, Calendar, CreditCard, Truck, X, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const PAYMENT_MAP: Record<string, { label: string; class: string }> = {
  paid: { label: "Pago", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  pending: { label: "Pendente", class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  refunded: { label: "Reembolsado", class: "bg-red-500/15 text-red-400 border-red-500/30" },
  voided: { label: "Cancelado", class: "bg-red-500/15 text-red-400 border-red-500/30" },
  authorized: { label: "Autorizado", class: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
};

const SHIPPING_MAP: Record<string, { label: string; class: string }> = {
  shipped: { label: "Enviado", class: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  unshipped: { label: "Não enviado", class: "bg-muted text-muted-foreground border-border" },
  delivered: { label: "Entregue", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  unpacked: { label: "Não empacotado", class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
};

const METHOD_MAP: Record<string, string> = {
  pix: "Pix", credit_card: "Cartão de Crédito", boleto: "Boleto", debit_card: "Débito",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Orders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [shippingFilter, setShippingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders-management"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nuvemshop_orders")
        .select("*")
        .order("order_date", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (paymentFilter !== "all" && o.payment_status !== paymentFilter) return false;
      if (shippingFilter !== "all" && o.shipping_status !== shippingFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const name = (o.customer_name || "").toLowerCase();
        const phone = (o.customer_phone || "").toLowerCase();
        const email = (o.customer_email || "").toLowerCase();
        const num = (o.order_number || String(o.nuvemshop_order_id)).toLowerCase();
        if (!name.includes(s) && !phone.includes(s) && !email.includes(s) && !num.includes(s)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, paymentFilter, shippingFilter]);

  const paginated = useMemo(() => filtered.slice(page * pageSize, (page + 1) * pageSize), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const stats = useMemo(() => {
    if (!orders) return { total: 0, paid: 0, pending: 0, shipped: 0, revenue: 0 };
    const paid = orders.filter(o => o.payment_status === "paid" && o.status !== "cancelled");
    return {
      total: orders.length,
      paid: paid.length,
      pending: orders.filter(o => o.payment_status === "pending").length,
      shipped: orders.filter(o => o.shipping_status === "shipped" || o.shipping_status === "delivered").length,
      revenue: paid.reduce((s, o) => s + (o.total || 0), 0),
    };
  }, [orders]);

  const handleSync = async () => {
    setSyncing(true);
    toast.info("Sincronizando pedidos...");
    try {
      let totalSynced = 0;
      let p = 1;
      let hasMore = true;
      while (hasMore && p <= 50) {
        const res = await supabase.functions.invoke(`nuvemshop-sync?page=${p}&per_page=50`);
        if (res.error) throw res.error;
        totalSynced += res.data?.synced || 0;
        hasMore = res.data?.has_more || false;
        p++;
      }
      toast.success(`${totalSynced} pedidos sincronizados`);
      queryClient.invalidateQueries({ queryKey: ["orders-management"] });
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Erro desconhecido"));
    } finally {
      setSyncing(false);
    }
  };

  const handleWhatsApp = (phone: string | null) => {
    if (!phone) return toast.error("Telefone não disponível");
    const clean = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${clean}`, "_blank");
  };

  const activeFilters = [statusFilter, paymentFilter, shippingFilter].filter(f => f !== "all").length;

  return (
    <div className="p-4 lg:p-8 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Pedidos</h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os pedidos da sua loja</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatPill label="Total" value={stats.total} />
        <StatPill label="Pagos" value={stats.paid} color="text-emerald-400" />
        <StatPill label="Pendentes" value={stats.pending} color="text-yellow-400" />
        <StatPill label="Enviados" value={stats.shipped} color="text-orange-400" />
        <StatPill label="Receita" value={formatCurrency(stats.revenue)} color="text-primary" />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, email ou nº pedido..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="closed">Fechado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={v => { setPaymentFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Pagamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Pagamento</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="refunded">Reembolsado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={shippingFilter} onValueChange={v => { setShippingFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Envio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Envio</SelectItem>
            <SelectItem value="unshipped">Não enviado</SelectItem>
            <SelectItem value="unpacked">Não empacotado</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
          </SelectContent>
        </Select>
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setPaymentFilter("all"); setShippingFilter("all"); }}>
            <X className="w-4 h-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">{filtered.length} pedidos encontrados</p>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Pedido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Envio</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-center w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  Nenhum pedido encontrado.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map(order => {
                const pay = PAYMENT_MAP[order.payment_status || ""] || { label: order.payment_status || "—", class: "bg-muted text-muted-foreground" };
                const ship = SHIPPING_MAP[order.shipping_status || ""] || { label: order.shipping_status || "—", class: "bg-muted text-muted-foreground" };
                const products = order.products as any[];
                const itemCount = Array.isArray(products) ? products.reduce((s: number, p: any) => s + (p.quantity || 1), 0) : 0;

                return (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOrder(order)}>
                    <TableCell className="font-mono text-xs">#{order.order_number || order.nuvemshop_order_id}</TableCell>
                    <TableCell className="text-sm">{formatDate(order.order_date || order.created_at)}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{order.customer_name || "—"}</span>
                        {itemCount > 0 && <span className="text-xs text-muted-foreground ml-1">({itemCount} itens)</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {order.customer_phone && <Phone className="w-3 h-3 text-muted-foreground" />}
                        {order.customer_email && <Mail className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(order.total || 0)}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${pay.class}`}>{pay.label}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${ship.class}`}>{ship.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{METHOD_MAP[order.payment_method || ""] || order.payment_method || "—"}</TableCell>
                    <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedOrder(order)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {order.customer_phone && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" onClick={() => handleWhatsApp(order.customer_phone)}>
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Pedido #{selectedOrder.order_number || selectedOrder.nuvemshop_order_id}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={PAYMENT_MAP[selectedOrder.payment_status || ""]?.class || ""}>
                    <CreditCard className="w-3 h-3 mr-1" />
                    {PAYMENT_MAP[selectedOrder.payment_status || ""]?.label || selectedOrder.payment_status || "—"}
                  </Badge>
                  <Badge variant="outline" className={SHIPPING_MAP[selectedOrder.shipping_status || ""]?.class || ""}>
                    <Truck className="w-3 h-3 mr-1" />
                    {SHIPPING_MAP[selectedOrder.shipping_status || ""]?.label || selectedOrder.shipping_status || "—"}
                  </Badge>
                  <Badge variant="outline">
                    {selectedOrder.status === "open" ? "Aberto" : selectedOrder.status === "closed" ? "Fechado" : selectedOrder.status === "cancelled" ? "Cancelado" : selectedOrder.status}
                  </Badge>
                </div>

                <Separator />

                {/* Customer Info */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">CLIENTE</h3>
                  <div className="space-y-2">
                    <p className="font-medium">{selectedOrder.customer_name || "—"}</p>
                    {selectedOrder.customer_phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selectedOrder.customer_phone}</span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-emerald-400" onClick={() => handleWhatsApp(selectedOrder.customer_phone)}>
                          WhatsApp
                        </Button>
                      </div>
                    )}
                    {selectedOrder.customer_email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{selectedOrder.customer_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Order Info */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">DETALHES</h3>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <span className="text-muted-foreground">Data</span>
                    <span>{formatDateTime(selectedOrder.order_date || selectedOrder.created_at)}</span>
                    <span className="text-muted-foreground">Método</span>
                    <span>{METHOD_MAP[selectedOrder.payment_method || ""] || selectedOrder.payment_method || "—"}</span>
                    <span className="text-muted-foreground">Moeda</span>
                    <span>{selectedOrder.currency || "BRL"}</span>
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(selectedOrder.total || 0)}</span>
                  </div>
                </div>

                <Separator />

                {/* Products */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">PRODUTOS</h3>
                  <div className="space-y-3">
                    {(selectedOrder.products as any[] || []).map((p: any, i: number) => (
                      <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{p.name || "Produto"}</p>
                          {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(parseFloat(p.price) || 0)}</p>
                          <p className="text-xs text-muted-foreground">x{p.quantity || 1}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping address from raw_data */}
                {selectedOrder.raw_data?.shipping_address && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">ENDEREÇO DE ENTREGA</h3>
                      <div className="text-sm space-y-1">
                        <p>{selectedOrder.raw_data.shipping_address.address || ""} {selectedOrder.raw_data.shipping_address.number || ""}</p>
                        {selectedOrder.raw_data.shipping_address.floor && <p>{selectedOrder.raw_data.shipping_address.floor}</p>}
                        <p>{selectedOrder.raw_data.shipping_address.city || ""} - {selectedOrder.raw_data.shipping_address.province || ""}</p>
                        <p className="text-muted-foreground">{selectedOrder.raw_data.shipping_address.zipcode || ""}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}
