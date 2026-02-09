import { AlertTriangle, Clock, XCircle, CheckCircle } from "lucide-react";
import { useRecentAlerts } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

export function AlertsCard() {
  const { data: alerts, isLoading } = useRecentAlerts();

  if (isLoading) {
    return (
      <div className="stat-card rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <h3 className="text-lg font-semibold text-foreground">Alertas</h3>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  const hasAlerts = (alerts?.waitingConversations || 0) > 0 || (alerts?.recentFailures || 0) > 0;

  return (
    <div className="stat-card rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-semibold text-foreground">Alertas</h3>
      </div>
      
      <div className="space-y-3">
        {alerts && alerts.waitingConversations > 0 && (
          <div className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-sm text-foreground">
                {alerts.waitingConversations} atendimento{alerts.waitingConversations > 1 ? "s" : ""} aguardando há mais de 10 min
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Agora</span>
          </div>
        )}
        
        {alerts && alerts.recentFailures > 0 && (
          <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-3">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-foreground">
                {alerts.recentFailures} envio{alerts.recentFailures > 1 ? "s" : ""} falhou na última hora
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Última hora</span>
          </div>
        )}

        {!hasAlerts && (
          <div className="flex items-center justify-center gap-2 p-6 text-success">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Tudo funcionando normalmente</span>
          </div>
        )}
      </div>
    </div>
  );
}
