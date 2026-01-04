import { 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp 
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChannelChart } from "@/components/dashboard/ChannelChart";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";

export default function Dashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da operação em tempo real</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Atendimentos Ativos"
          value={47}
          change={{ value: 12, type: "increase" }}
          icon={MessageSquare}
          variant="accent"
        />
        <StatCard
          title="Clientes Atendidos Hoje"
          value={128}
          change={{ value: 8, type: "increase" }}
          icon={Users}
        />
        <StatCard
          title="Tempo Médio de Resposta"
          value="2m 34s"
          change={{ value: 15, type: "decrease" }}
          icon={Clock}
          variant="accent"
        />
        <StatCard
          title="Taxa de Resolução"
          value="94%"
          change={{ value: 3, type: "increase" }}
          icon={CheckCircle}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>
        <ChannelChart />
      </div>

      {/* Alerts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="stat-card rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-semibold text-foreground">Alertas</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                <span className="text-sm text-foreground">5 atendimentos aguardando há mais de 10 min</span>
              </div>
              <span className="text-xs text-muted-foreground">Agora</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-destructive rounded-full" />
                <span className="text-sm text-foreground">SLA estourado em 2 conversas</span>
              </div>
              <span className="text-xs text-muted-foreground">5 min atrás</span>
            </div>
          </div>
        </div>

        {/* Top Agents */}
        <div className="stat-card rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold text-foreground">Top Atendentes</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: "Carlos Oliveira", atendimentos: 45, rating: 4.9 },
              { name: "Fernanda Costa", atendimentos: 38, rating: 4.8 },
              { name: "Rafael Santos", atendimentos: 32, rating: 4.7 },
            ].map((agent, index) => (
              <div key={agent.name} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">{agent.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{agent.atendimentos} atend.</span>
                  <span className="text-sm text-accent">★ {agent.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
