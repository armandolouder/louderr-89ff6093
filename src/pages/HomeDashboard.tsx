import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Users,
  Percent,
  BarChart3,
  ArrowRight,
  MessageSquare,
  Mail,
  RefreshCw,
  Search,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function useHomeDashboard() {
  return useQuery({
    queryKey: ["home-dashboard"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [ordersRes, abandonedRes, customersRes, conversationsRes, campaignsRes, sendLogsRes] = await Promise.all([
        supabase
          .from("nuvemshop_orders")
          .select("*")
          .gte("order_date", startOfMonth)
          .lte("order_date", endOfMonth)
          .not("status", "in", '("cancelled","closed")')
          .limit(1000),
        supabase
          .from("nuvemshop_abandoned_checkouts")
          .select("*")
          .gte("created_at", startOfMonth)
          .lte("created_at", endOfMonth),
        supabase
          .from("imported_customers")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("conversations")
          .select("id, status")
          .in("status", ["novo", "em_atendimento", "aguardando"]),
        supabase
          .from("campaigns")
          .select("id, status")
          .in("status", ["running", "scheduled"]),
        supabase
          .from("send_logs")
          .select("status")
          .gte("sent_at", startOfMonth)
          .lte("sent_at", endOfMonth),
      ]);

      const orders = ordersRes.data || [];
      const abandoned = abandonedRes.data || [];
      const totalCustomers = customersRes.count || 0;
      const conversations = conversationsRes.data || [];
      const campaigns = campaignsRes.data || [];
      const sendLogs = sendLogsRes.data || [];

      // Financial - paid only
      const paidOrders = orders.filter((o: any) => o.payment_status === "paid");
      const revenue = paidOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const totalCosts = paidOrders.reduce((s: number, o: any) => s + (o.production_cost || 0), 0);
      const profit = revenue - totalCosts;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const avgTicket = paidOrders.length > 0 ? revenue / paidOrders.length : 0;

      // Pending
      const pendingOrders = orders.filter((o: any) => o.payment_status === "pending" || o.payment_status === "authorized");
      const pendingRevenue = pendingOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);

      // Abandoned
      const abandonedTotal = abandoned.reduce((s: number, c: any) => s + (c.total || 0), 0);
      const recoveredCount = abandoned.filter((c: any) => c.recovered).length;
      const recoveryRate = abandoned.length > 0 ? (recoveredCount / abandoned.length) * 100 : 0;

      // Products sold
      const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
      paidOrders.forEach((o: any) => {
        const prods = o.products as any[];
        if (Array.isArray(prods)) {
          prods.forEach((p: any) => {
            const name = p.name || "Produto";
            const variant = [p.variant_values || p.variant, p.size].filter(Boolean).join(", ");
            const fullName = variant ? `${name} (${variant})` : name;
            const qty = p.quantity || 1;
            const price = (p.price || 0) * qty;
            const existing = productMap.get(fullName);
            if (existing) {
              existing.qty += qty;
              existing.revenue += price;
            } else {
              productMap.set(fullName, { name: fullName, qty, revenue: price });
            }
          });
        }
      });
      const products = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
      const totalProductQty = products.reduce((s, p) => s + p.qty, 0);

      // Messages
      const sentMessages = sendLogs.filter((l: any) => l.status === "sent").length;
      const failedMessages = sendLogs.filter((l: any) => l.status === "failed").length;

      return {
        revenue, totalCosts, profit, margin, avgTicket,
        paidOrdersCount: paidOrders.length,
        pendingOrdersCount: pendingOrders.length,
        pendingRevenue,
        abandonedCount: abandoned.length,
        abandonedTotal, recoveredCount, recoveryRate,
        totalCustomers,
        activeConversations: conversations.length,
        activeCampaigns: campaigns.length,
        sentMessages, failedMessages,
        totalOrders: orders.length,
        products, totalProductQty,
      };
    },
    staleTime: 30000,
  });
}

export default function HomeDashboard() {
  const { data, isLoading } = useHomeDashboard();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const now = new Date();
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    if (!search.trim()) return data.products;
    const q = search.toLowerCase();
    return data.products.filter(p => p.name.toLowerCase().includes(q));
  }, [data?.products, search]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const d = data!;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resumo Geral</h1>
          <p className="text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Lucro Líquido - Hero Card */}
      <Card className="border-primary/20">
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Faturamento Líquido</p>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Receita total menos custos de produção (CPV)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-4xl font-bold text-foreground mt-1">{formatCurrency(d.profit)}</p>
            </div>
            <div className={`p-3 rounded-lg ${d.profit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
              {d.profit >= 0 ? (
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              ) : (
                <TrendingDown className="w-6 h-6 text-destructive" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendas por Produto */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Vendas por Produto</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Produtos vendidos no mês atual (somente pedidos pagos)</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Badge variant="secondary">{d.totalProductQty} itens</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {search ? "Nenhum produto encontrado" : "Nenhum produto vendido no período"}
            </p>
          ) : (
            filteredProducts.slice(0, 15).map((product, i) => {
              const pct = d.totalProductQty > 0 ? (product.qty / d.totalProductQty) * 100 : 0;
              return (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <p className="text-sm text-foreground flex-1 pr-4 truncate">{product.name}</p>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-medium text-foreground w-6 text-right">{product.qty}</span>
                    <div className="w-8 h-8 relative">
                      <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15.9" fill="none"
                          stroke="hsl(var(--primary))" strokeWidth="3"
                          strokeDasharray={`${pct} ${100 - pct}`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-muted-foreground w-14 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })
          )}
          {filteredProducts.length > 15 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{filteredProducts.length - 15} produtos...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Financial Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Receita (Pagos)"
          value={formatCurrency(d.revenue)}
          subtitle={`${d.paidOrdersCount} pedidos pagos`}
          icon={DollarSign}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
        />
        <KPICard
          title="Custos de Produto (CPV)"
          value={formatCurrency(d.totalCosts)}
          subtitle={d.totalCosts > 0 ? `${((d.totalCosts / (d.revenue || 1)) * 100).toFixed(1)}% da receita` : "Sem custos lançados"}
          icon={Package}
          color="text-orange-500"
          bg="bg-orange-500/10"
        />
        <KPICard
          title="Margem de Lucro"
          value={`${d.margin.toFixed(1)}%`}
          subtitle={`Ticket médio ${formatCurrency(d.avgTicket)}`}
          icon={Percent}
          color={d.margin >= 30 ? "text-emerald-500" : d.margin >= 15 ? "text-warning" : "text-destructive"}
          bg={d.margin >= 30 ? "bg-emerald-500/10" : d.margin >= 15 ? "bg-warning/10" : "bg-destructive/10"}
        />
        <KPICard
          title="Ticket Médio"
          value={formatCurrency(d.avgTicket)}
          subtitle={`${d.totalOrders} pedidos no total`}
          icon={BarChart3}
          color="text-primary"
          bg="bg-primary/10"
        />
      </div>

      {/* Pending & Abandoned */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-warning/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vendas Pendentes</CardTitle>
              <Badge variant="secondary">{d.pendingOrdersCount} pedidos</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(d.pendingRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Boleto / Pix aguardando pagamento</p>
            <Button variant="link" className="p-0 h-auto mt-2 text-xs" onClick={() => navigate("/sales")}>
              Ver no Painel de Vendas <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Carrinhos Abandonados</CardTitle>
              <Badge variant="destructive">{d.abandonedCount}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(d.abandonedTotal)}</p>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={d.recoveryRate} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">{d.recoveryRate.toFixed(0)}% recuperados</span>
            </div>
            <Button variant="link" className="p-0 h-auto mt-1 text-xs" onClick={() => navigate("/abandoned-checkouts")}>
              Ver carrinhos <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Receita</span>
                <span className="font-medium">{formatCurrency(d.revenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">(-) Custos</span>
                <span className="font-medium text-destructive">-{formatCurrency(d.totalCosts)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm">
                <span className="font-semibold">(=) Lucro Líquido</span>
                <span className="font-bold text-emerald-500">{formatCurrency(d.profit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniCard title="Clientes" value={d.totalCustomers} icon={Users} onClick={() => navigate("/customers")} />
        <MiniCard title="Conversas Ativas" value={d.activeConversations} icon={MessageSquare} onClick={() => navigate("/inbox")} />
        <MiniCard title="Campanhas Ativas" value={d.activeCampaigns} icon={Mail} onClick={() => navigate("/campaigns")} />
        <MiniCard title="Mensagens Enviadas" value={d.sentMessages} icon={TrendingUp} subtitle={d.failedMessages > 0 ? `${d.failedMessages} falharam` : undefined} />
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, icon: Icon, color, bg }: {
  title: string; value: string; subtitle: string; icon: any; color: string; bg: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-lg ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniCard({ title, value, icon: Icon, onClick, subtitle }: {
  title: string; value: number; icon: any; onClick?: () => void; subtitle?: string;
}) {
  return (
    <Card className={onClick ? "cursor-pointer hover:border-primary/50 transition-colors" : ""} onClick={onClick}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-destructive">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
