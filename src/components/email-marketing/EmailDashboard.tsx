import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, Eye, MousePointer, Ban, Clock, ShoppingBag, DollarSign } from "lucide-react";
import { format } from "date-fns";

export function EmailDashboard() {
  const [filter, setFilter] = useState("all");
  const [attrWindow, setAttrWindow] = useState("7");

  const { data: attribution } = useQuery({
    queryKey: ["email-attribution", attrWindow],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_email_attribution", {
        p_window_days: Number(attrWindow),
      });
      if (error) throw error;
      return data || [];
    },
  });

  const attrTotals = (attribution || []).reduce(
    (acc, r: any) => ({
      orders: acc.orders + Number(r.attributed_orders || 0),
      revenue: acc.revenue + Number(r.revenue || 0),
    }),
    { orders: 0, revenue: 0 }
  );
  const fmtBRL = (v: number) =>
    `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const { data: stats } = useQuery({
    queryKey: ["email-stats"],
    queryFn: async () => {
      const [campaignsRes, queueRes, todayRes, unsubRes] = await Promise.all([
        supabase.from("email_campaigns").select("sent_count, opened_count, clicked_count, bounced_count, failed_count"),
        supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", new Date().toISOString().split("T")[0]),
        supabase.from("email_unsubscribes").select("id", { count: "exact", head: true }),
      ]);

      const campaigns = campaignsRes.data || [];
      const totals = campaigns.reduce(
        (acc, c) => ({
          sent: acc.sent + (c.sent_count || 0),
          opened: acc.opened + (c.opened_count || 0),
          clicked: acc.clicked + (c.clicked_count || 0),
          bounced: acc.bounced + (c.bounced_count || 0),
          failed: acc.failed + (c.failed_count || 0),
        }),
        { sent: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 }
      );

      return {
        ...totals,
        pending: queueRes.count || 0,
        sentToday: todayRes.count || 0,
        unsubscribed: unsubRes.count || 0,
        openRate: totals.sent > 0 ? ((totals.opened / totals.sent) * 100).toFixed(1) : "0",
        clickRate: totals.opened > 0 ? ((totals.clicked / totals.opened) * 100).toFixed(1) : "0",
      };
    },
  });

  const { data: queueHistory } = useQuery({
    queryKey: ["email-queue-history", filter],
    queryFn: async () => {
      let query = supabase
        .from("email_queue")
        .select("id, email, customer_name, subject, status, sent_at, created_at, error_message, campaign_id")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const cards = [
    { label: "Enviados Total", value: stats?.sent || 0, icon: Send, color: "text-blue-400" },
    { label: "Enviados Hoje", value: `${stats?.sentToday || 0}/250`, icon: Clock, color: "text-amber-400" },
    { label: "Na Fila", value: stats?.pending || 0, icon: Mail, color: "text-purple-400" },
    { label: "Taxa de Abertura", value: `${stats?.openRate || 0}%`, icon: Eye, color: "text-emerald-400" },
    { label: "Taxa de Clique", value: `${stats?.clickRate || 0}%`, icon: MousePointer, color: "text-cyan-400" },
    { label: "Opt-outs", value: stats?.unsubscribed || 0, icon: Ban, color: "text-destructive" },
  ];

  const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pendente", variant: "outline" },
    sent: { label: "Enviado", variant: "default" },
    failed: { label: "Falha", variant: "destructive" },
    skipped: { label: "Ignorado", variant: "secondary" },
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Métricas & Histórico</h2>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Queue history */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Histórico de Envios</h3>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
              <SelectItem value="failed">Falhas</SelectItem>
              <SelectItem value="skipped">Ignorados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!queueHistory?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum envio registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  queueHistory.map((item) => {
                    const sb = statusBadge[item.status || "pending"];
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{item.customer_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{item.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{item.subject}</TableCell>
                        <TableCell>
                          <Badge variant={sb.variant} className="text-xs">{sb.label}</Badge>
                          {item.error_message && (
                            <p className="text-xs text-destructive mt-1 max-w-[150px] truncate" title={item.error_message}>
                              {item.error_message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.sent_at
                            ? format(new Date(item.sent_at), "dd/MM HH:mm")
                            : format(new Date(item.created_at), "dd/MM HH:mm")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
