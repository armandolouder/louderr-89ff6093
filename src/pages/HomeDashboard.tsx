import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Percent,
  BarChart3,
  ArrowRight,
  MessageSquare,
  Mail,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function useHomeDashboard(year: number, month: number) {
  return useQuery({
    queryKey: ["home-dashboard", year, month],
    queryFn: async () => {
      const startOfMonth = new Date(year, month, 1).toISOString();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const [ordersRes, abandonedRes, customersRes, conversationsRes, campaignsRes, brevoCreditsRes] = await Promise.all([
        supabase
          .from("nuvemshop_orders")
          .select("*")
          .gte("order_date", startOfMonth)
          .lte("order_date", endOfMonth)
          .not("status", "in", '("cancelled","closed")')
          .order("order_date", { ascending: false })
          .limit(1000),
        supabase
          .from("nuvemshop_abandoned_checkouts")
          .select("*")
          .gte("created_at", startOfMonth)
          .lte("created_at", endOfMonth),
        supabase
          .from("imported_customers")
          .select("id", { count: "exact", head: true })
          .gt("total_spent", 0),
        supabase
          .from("conversations")
          .select("id, status")
          .in("status", ["novo", "em_atendimento", "aguardando"]),
        supabase
          .from("campaigns")
          .select("id, status")
          .in("status", ["running", "scheduled"]),
        supabase.functions.invoke("send-brevo-email", {
          body: { action: "check-credits" },
        }),
      ]);

      const orders = ordersRes.data || [];
      const abandoned = abandonedRes.data || [];
      const totalCustomers = customersRes.count || 0;
      const conversations = conversationsRes.data || [];
      const campaigns = campaignsRes.data || [];

      // Brevo credits
      let brevoCreditsRemaining = 0;
      try {
        if (brevoCreditsRes.data?.success && brevoCreditsRes.data.credits) {
          const emailPlan = brevoCreditsRes.data.credits.find((c: any) => c.type === "sendLimit");
          if (emailPlan) brevoCreditsRemaining = emailPlan.credits;
        }
      } catch {}

      // Financial metrics - only paid orders
      const paidOrders = orders.filter((o: any) => o.payment_status === "paid");
      const revenue = paidOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const totalCosts = paidOrders.reduce((s: number, o: any) => s + (o.production_cost || 0), 0);
      const profit = revenue - totalCosts;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const avgTicket = paidOrders.length > 0 ? revenue / paidOrders.length : 0;

      // Pending orders
      const pendingOrders = orders.filter((o: any) => o.payment_status === "pending" || o.payment_status === "authorized");
      const pendingRevenue = pendingOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);

      // Abandoned carts
      const abandonedTotal = abandoned.reduce((s: number, c: any) => s + (c.total || 0), 0);
      const recoveredCount = abandoned.filter((c: any) => c.recovered).length;
      const recoveryRate = abandoned.length > 0 ? (recoveredCount / abandoned.length) * 100 : 0;

      // Recent orders with products
      const recentOrders = orders.slice(0, 10).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.customer_name || "—",
        total: o.total || 0,
        status: o.payment_status,
        date: o.order_date,
        products: Array.isArray(o.products) ? o.products : [],
      }));

      return {
        revenue,
        totalCosts,
        profit,
        margin,
        avgTicket,
        paidOrdersCount: paidOrders.length,
        pendingOrdersCount: pendingOrders.length,
        pendingRevenue,
        abandonedCount: abandoned.length,
        abandonedTotal,
        recoveredCount,
        recoveryRate,
        totalCustomers,
        activeConversations: conversations.length,
        activeCampaigns: campaigns.length,
        brevoCreditsRemaining,
        totalOrders: orders.length,
        recentOrders,
      };
    },
    staleTime: 30000,
  });
}

export default function HomeDashboard() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const { data, isLoading } = useHomeDashboard(selectedYear, selectedMonth);
  const navigate = useNavigate();

  const monthLabel = new Date(selectedYear, selectedMonth).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header with month selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resumo Geral</h1>
          <div className="flex items-center gap-2 mt-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <p className="text-muted-foreground capitalize font-medium min-w-[160px] text-center">{monthLabel}</p>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth} disabled={isCurrentMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Row 1: Financial KPIs - Lucro primeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Lucro Líquido"
          value={formatCurrency(d.profit)}
          subtitle={`Margem ${d.margin.toFixed(1)}%`}
          icon={d.profit >= 0 ? TrendingUp : TrendingDown}
          color={d.profit >= 0 ? "text-emerald-500" : "text-destructive"}
          bg={d.profit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"}
        />
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
          subtitle={d.totalCosts > 0 ? `${((d.totalCosts / d.revenue) * 100).toFixed(1)}% da receita` : "Sem custos lançados"}
          icon={Package}
          color="text-orange-500"
          bg="bg-orange-500/10"
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

      {/* Row 2: Pending & Abandoned */}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Margem de Lucro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className={`text-4xl font-bold ${d.margin >= 30 ? "text-emerald-500" : d.margin >= 15 ? "text-warning" : "text-destructive"}`}>
                {d.margin.toFixed(1)}%
              </p>
              <Percent className="w-5 h-5 text-muted-foreground mb-1" />
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Receita</span>
                <span className="font-medium">{formatCurrency(d.revenue)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">(-) Custos</span>
                <span className="font-medium text-destructive">-{formatCurrency(d.totalCosts)}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between text-xs">
                <span className="text-muted-foreground font-semibold">(=) Lucro</span>
                <span className="font-bold text-emerald-500">{formatCurrency(d.profit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Operational */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniCard
          title="Clientes (RFM)"
          value={d.totalCustomers}
          icon={Users}
          onClick={() => navigate("/customers")}
          subtitle="com compras realizadas"
        />
        <MiniCard
          title="Conversas Ativas"
          value={d.activeConversations}
          icon={MessageSquare}
          onClick={() => navigate("/inbox")}
        />
        <MiniCard
          title="Campanhas Ativas"
          value={d.activeCampaigns}
          icon={Mail}
          onClick={() => navigate("/campaigns")}
        />
        <MiniCard
          title="Créditos Brevo"
          value={d.brevoCreditsRemaining}
          icon={Mail}
          subtitle="e-mails restantes"
        />
      </div>

      {/* Row 4: Recent Orders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              Últimos Pedidos do Mês
            </CardTitle>
            <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate("/sales")}>
              Ver todos <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {d.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido neste mês</p>
          ) : (
            <ScrollArea className="max-h-[320px]">
              <div className="space-y-3">
                {d.recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">#{order.orderNumber}</span>
                        <Badge variant={order.status === "paid" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                          {order.status === "paid" ? "Pago" : order.status === "pending" ? "Pendente" : order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{order.customerName}</p>
                      {order.products.length > 0 && (
                        <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                          {order.products.slice(0, 2).map((p: any) => p.name || p.product_name || "Produto").join(", ")}
                          {order.products.length > 2 && ` +${order.products.length - 2}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(order.total)}</p>
                      {order.date && (
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(order.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
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
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
