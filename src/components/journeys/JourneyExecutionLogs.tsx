import { useJourneyExecutions } from "@/hooks/useJourneys";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, Play, User, Mail, Phone } from "lucide-react";

interface Props {
  journeyId: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", icon: Play, variant: "default" },
  waiting: { label: "Aguardando", icon: Clock, variant: "secondary" },
  completed: { label: "Concluído", icon: CheckCircle, variant: "outline" },
  failed: { label: "Erro", icon: XCircle, variant: "destructive" },
  cancelled: { label: "Cancelado", icon: XCircle, variant: "secondary" },
};

export function JourneyExecutionLogs({ journeyId }: Props) {
  const { data: executions, isLoading } = useJourneyExecutions(journeyId);

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  if (!executions || executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <Clock className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">Nenhuma execução registrada ainda</p>
        <p className="text-xs mt-1">Os disparos aparecerão aqui quando a jornada estiver ativa</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {executions.map((exec) => {
          const cfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.active;
          const Icon = cfg.icon;
          return (
            <div
              key={exec.id}
              className="rounded-lg border border-border bg-card p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <Badge variant={cfg.variant} className="text-[10px]">
                    {cfg.label}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(exec.started_at), "dd/MM HH:mm")}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {exec.customer_name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {exec.customer_name}
                  </span>
                )}
                {exec.customer_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {exec.customer_email}
                  </span>
                )}
                {exec.customer_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {exec.customer_phone}
                  </span>
                )}
                {!exec.customer_name && !exec.customer_email && !exec.customer_phone && (
                  <span className="italic">Visitante anônimo</span>
                )}
              </div>

              {exec.current_node_id && (
                <p className="text-[10px] text-muted-foreground">
                  Nó atual: <span className="font-mono">{exec.current_node_id}</span>
                </p>
              )}

              {exec.error_message && (
                <p className="text-[10px] text-destructive">{exec.error_message}</p>
              )}

              {exec.completed_at && (
                <p className="text-[10px] text-muted-foreground">
                  Concluído: {format(new Date(exec.completed_at), "dd/MM HH:mm")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
