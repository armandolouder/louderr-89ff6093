import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SendLog {
  id: string;
  campaign_id: string | null;
  channel: string;
  phone: string | null;
  email: string | null;
  content: string | null;
  cluster_name: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "destructive" | "secondary"; icon: React.ElementType }> = {
  sent: { label: "Enviado", variant: "default", icon: CheckCircle2 },
  failed: { label: "Falhou", variant: "destructive", icon: XCircle },
  pending: { label: "Pendente", variant: "secondary", icon: Clock },
};

export function SendLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["send-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("send_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as SendLog[];
    },
  });

  const hasLogs = logs && logs.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Logs de Envio</h2>
        <p className="text-sm text-muted-foreground">
          Histórico de todas as mensagens enviadas
        </p>
      </div>

      {/* Empty State */}
      {!hasLogs && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum log encontrado
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Os logs aparecerão aqui quando você iniciar uma campanha de envio.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Logs Table */}
      {hasLogs && (
        <Card>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead className="max-w-[300px]">Mensagem</TableHead>
                  <TableHead>Erro</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const config = statusConfig[log.status] || statusConfig.pending;
                  const StatusIcon = config.icon;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant={config.variant} className="text-xs">
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.phone || log.email || "-"}
                      </TableCell>
                      <TableCell>
                        {log.cluster_name || "-"}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {log.content || "-"}
                      </TableCell>
                      <TableCell className="text-destructive text-sm">
                        {log.error_message || "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.sent_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
