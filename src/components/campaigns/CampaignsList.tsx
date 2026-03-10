import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Send, Pause, Play, Loader2, Clock, CheckCircle2, XCircle, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateCampaignView } from "./CreateCampaignView";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";
  channel: "whatsapp" | "email" | "both";
  daily_limit: number;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  scheduled_at: string | null;
}

const statusConfig = {
  draft: { label: "Rascunho", variant: "secondary" as const, icon: Clock },
  scheduled: { label: "Agendada", variant: "outline" as const, icon: Clock },
  running: { label: "Enviando", variant: "default" as const, icon: Send },
  paused: { label: "Pausada", variant: "secondary" as const, icon: Pause },
  completed: { label: "Concluída", variant: "default" as const, icon: CheckCircle2 },
  cancelled: { label: "Cancelada", variant: "destructive" as const, icon: XCircle },
};

export function CampaignsList() {
  const [showCreateView, setShowCreateView] = useState(false);
  const [processingCampaignId, setProcessingCampaignId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    refetchInterval: 5000,
  });

  const processQueueMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      setProcessingCampaignId(campaignId);
      const { data, error } = await supabase.functions.invoke("process-whatsapp-queue", {
        body: { campaignId, limit: 10 },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao processar fila");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Processado: ${data.sent} enviados, ${data.failed} falhas`);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (error) => {
      console.error("Error processing queue:", error);
      toast.error("Erro ao processar fila: " + error.message);
    },
    onSettled: () => {
      setProcessingCampaignId(null);
    },
  });

  if (showCreateView) {
    return <CreateCampaignView onBack={() => setShowCreateView(false)} />;
  }

  const hasCampaigns = campaigns && campaigns.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Campanhas</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie suas campanhas de WhatsApp
          </p>
        </div>
        <Button onClick={() => setShowCreateView(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {!hasCampaigns && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhuma campanha criada
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Crie sua primeira campanha para começar a enviar mensagens.
            </p>
            <Button onClick={() => setShowCreateView(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Campanha
            </Button>
          </CardContent>
        </Card>
      )}

      {hasCampaigns && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Dest.</TableHead>
                <TableHead className="text-center">Enviados</TableHead>
                <TableHead className="text-center">Falhas</TableHead>
                <TableHead className="text-right">Progresso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const config = statusConfig[campaign.status];
                const StatusIcon = config.icon;
                const progress = campaign.total_recipients > 0
                  ? (campaign.sent_count / campaign.total_recipients) * 100
                  : 0;

                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(campaign.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant} className="text-xs">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{campaign.total_recipients}</TableCell>
                    <TableCell className="text-center text-primary font-medium">{campaign.sent_count}</TableCell>
                    <TableCell className="text-center text-destructive font-medium">{campaign.failed_count}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-medium">{progress.toFixed(0)}%</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {campaign.status === "running" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => processQueueMutation.mutate(campaign.id)}
                              disabled={processingCampaignId === campaign.id}
                            >
                              {processingCampaignId === campaign.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Zap className="w-4 h-4" />
                              )}
                            </Button>
                            <Button size="sm" variant="outline">
                              <Pause className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {campaign.status === "paused" && (
                          <Button size="sm" variant="outline">
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
