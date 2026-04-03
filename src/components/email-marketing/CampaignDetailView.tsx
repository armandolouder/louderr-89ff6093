import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Send, Users, Eye, MousePointer, XCircle, CheckCircle, Clock, Mail } from "lucide-react";
import { format } from "date-fns";

interface Props {
  campaignId: string;
  onBack: () => void;
}

export function CampaignDetailView({ campaignId, onBack }: Props) {
  const [previewHtml, setPreviewHtml] = useState("");

  const { data: campaign } = useQuery({
    queryKey: ["email-campaign-detail", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: queueStats } = useQuery({
    queryKey: ["email-campaign-queue", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_queue")
        .select("status, email, customer_name, sent_at, error_message, subject, html_content")
        .eq("campaign_id", campaignId)
        .order("sent_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;

      const sent = data.filter((q) => q.status === "sent").length;
      const pending = data.filter((q) => q.status === "pending").length;
      const failed = data.filter((q) => q.status === "failed").length;
      const skipped = data.filter((q) => q.status === "skipped").length;

      return { items: data, sent, pending, failed, skipped, total: data.length };
    },
  });

  if (!campaign) return null;

  const progress = campaign.total_recipients
    ? Math.round(((campaign.sent_count || 0) / campaign.total_recipients) * 100)
    : 0;

  const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pendente", variant: "outline" },
    sent: { label: "Enviado", variant: "default" },
    failed: { label: "Falha", variant: "destructive" },
    skipped: { label: "Ignorado", variant: "secondary" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{campaign.name}</h2>
          {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Total", value: campaign.total_recipients || 0, icon: Users, color: "text-foreground" },
          { label: "Enviados", value: campaign.sent_count || 0, icon: Send, color: "text-blue-400" },
          { label: "Abertos", value: campaign.opened_count || 0, icon: Eye, color: "text-emerald-400" },
          { label: "Clicados", value: campaign.clicked_count || 0, icon: MousePointer, color: "text-cyan-400" },
          { label: "Falhas", value: campaign.failed_count || 0, icon: XCircle, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      {campaign.total_recipients > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso do envio</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Na fila: {queueStats?.pending || 0}</span>
              <span>Enviados: {queueStats?.sent || 0}</span>
              <span>Falhas: {queueStats?.failed || 0}</span>
              <span>Ignorados: {queueStats?.skipped || 0}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline/Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Log de Envios</CardTitle>
        </CardHeader>
        <div className="overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinatário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!queueStats?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum envio registrado
                  </TableCell>
                </TableRow>
              ) : (
                queueStats.items.map((item, i) => {
                  const sb = statusBadge[item.status || "pending"];
                  return (
                    <TableRow key={i}>
                      <TableCell>
                        <p className="font-medium text-sm">{item.customer_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sb.variant} className="text-xs">{sb.label}</Badge>
                        {item.error_message && (
                          <p className="text-xs text-destructive mt-1 max-w-[150px] truncate" title={item.error_message}>
                            {item.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.sent_at ? format(new Date(item.sent_at), "dd/MM HH:mm") : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setPreviewHtml(item.html_content || "")}
                        >
                          <Eye className="w-3 h-3 mr-1" /> Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Email preview dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml("")}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Email Enviado</DialogTitle></DialogHeader>
          <div className="border rounded-lg overflow-auto max-h-[65vh]">
            <iframe srcDoc={previewHtml} className="w-full min-h-[500px] border-0" title="Email Preview" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
