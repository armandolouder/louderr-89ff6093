import { useMemo } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

      // Financial metrics - only paid orders
      const paidOrders = orders.filter((o: any) => o.payment_status === "paid");
      const revenue = paidOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const totalCosts = paidOrders.reduce((s: number, o: any) => s + (o.production_cost || 0), 0);
      const profit = revenue - totalCosts;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const avgTicket = paidOrders.length > 0 ? revenue / paidOrders.length : 0;

      // Pending orders (not paid yet)
      const pendingOrders = orders.filter((o: any) => o.payment_status === "pending" || o.payment_status === "authorized");
      const pendingRevenue = pendingOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);

      // Abandoned carts
      const abandonedTotal = abandoned.reduce((s: number, c: any) => s + (c.total || 0), 0);
      const recoveredCount = abandoned.filter((c: any) => c.recovered).length;
      const recoveryRate = abandoned.length > 0 ? (recoveredCount / abandoned.length) * 100 : 0;

      // Messages
      const sentMessages = sendLogs.filter((l: any) => l.status === "sent").length;
      const failedMessages = sendLogs.filter((l: any) => l.status === "failed").length;

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
        sentMessages,
        failedMessages,
        totalOrders: orders.length,
      };
    },
    staleTime: 30000,
  });
}

export default function HomeDashboard() {
  const { data, isLoading } = useHomeDashboard();
  const navigate = useNavigate();
  const now = new Date();
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resumo Geral</h1>
          <p className="text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Row 1: Financial KPIs */}
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
          subtitle={d.totalCosts > 0 ? `${((d.totalCosts / d.revenue) * 100).toFixed(1)}% da receita` : "Sem custos lançados"}
          icon={Package}
          color="text-orange-500"
          bg="bg-orange-500/10"
        />
        <KPICard
          title="Lucro Líquido"
          value={formatCurrency(d.profit)}
          subtitle={`Margem ${d.margin.toFixed(1)}%`}
          icon={d.profit >= 0 ? TrendingUp : TrendingDown}
          color={d.profit >= 0 ? "text-emerald-500" : "text-destructive"}
          bg={d.profit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"}
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
        {/* Pending Orders */}
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

        {/* Abandoned Carts */}
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

        {/* Margin Overview */}
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
          title="Clientes"
          value={d.totalCustomers}
          icon={Users}
          onClick={() => navigate("/customers")}
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
          title="Mensagens Enviadas"
          value={d.sentMessages}
          icon={TrendingUp}
          subtitle={d.failedMessages > 0 ? `${d.failedMessages} falharam` : undefined}
        />
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
