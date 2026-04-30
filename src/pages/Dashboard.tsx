import { useState, lazy, Suspense } from "react";
import { 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle,
  Inbox,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { CampaignStats } from "@/components/dashboard/CampaignStats";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { AlertsCard } from "@/components/dashboard/AlertsCard";
import { CustomerStats } from "@/components/dashboard/CustomerStats";
import { 
  useDashboardStats, 
  useHourlyActivity, 
  type PeriodFilter as PeriodFilterType 
} from "@/hooks/useDashboardStats";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const ChannelChart = lazy(() =>
  import("@/components/dashboard/ChannelChart").then((m) => ({ default: m.ChannelChart }))
);
const PerformanceChart = lazy(() =>
  import("@/components/dashboard/PerformanceChart").then((m) => ({ default: m.PerformanceChart }))
);
const ChartFallback = () => (
  <Skeleton className="w-full h-[300px]" />
);

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodFilterType>("today");
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useDashboardStats(period);
  const { data: hourlyData, isLoading: hourlyLoading } = useHourlyActivity(period);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-hourly"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] });
  };

  const periodLabel = {
    today: "Hoje",
    week: "Esta semana",
    month: "Este mês"
  }[period];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da operação • {periodLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodFilter value={period} onChange={setPeriod} />
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            className="shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Conversas Ativas"
              value={stats?.activeConversations ?? 0}
              icon={MessageSquare}
              variant="accent"
            />
            <StatCard
              title="Novas Conversas"
              value={stats?.newConversations ?? 0}
              icon={Inbox}
            />
            <StatCard
              title="Total de Mensagens"
              value={stats?.totalMessages ?? 0}
              icon={TrendingUp}
              variant="accent"
            />
            <StatCard
              title="Finalizadas"
              value={stats?.finishedConversations ?? 0}
              icon={CheckCircle}
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart 
            data={hourlyData} 
            isLoading={hourlyLoading}
            title={`Mensagens por Hora • ${periodLabel}`}
          />
        </div>
        <ChannelChart 
          whatsappCount={stats?.whatsappCount ?? 0}
          instagramCount={stats?.instagramCount ?? 0}
          isLoading={statsLoading}
        />
      </div>

      {/* Campaigns & Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CampaignStats
          sentMessages={stats?.sentMessages ?? 0}
          failedMessages={stats?.failedMessages ?? 0}
          successRate={stats?.successRate ?? 0}
          activeCampaigns={stats?.activeCampaigns ?? 0}
        />
        <CustomerStats
          totalCustomers={stats?.totalCustomers ?? 0}
          customersWithPhone={stats?.customersWithPhone ?? 0}
          totalClusters={stats?.totalClusters ?? 0}
        />
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertsCard />
        
        {/* Status Overview */}
        <div className="stat-card rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Status das Conversas</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Novos", value: stats?.statusNovo ?? 0, color: "bg-blue-500" },
              { label: "Em Atendimento", value: stats?.statusEmAtendimento ?? 0, color: "bg-success" },
              { label: "Aguardando", value: stats?.statusAguardando ?? 0, color: "bg-warning" },
              { label: "Finalizados", value: stats?.statusFinalizado ?? 0, color: "bg-muted-foreground" },
            ].map((status) => (
              <div 
                key={status.label}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${status.color}`} />
                  <span className="text-sm text-muted-foreground">{status.label}</span>
                </div>
                <span className="text-lg font-bold text-foreground">{status.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
