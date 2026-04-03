import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, Eye, MousePointer, Ban, Clock } from "lucide-react";

export function EmailDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["email-stats"],
    queryFn: async () => {
      const [campaignsRes, queueRes, todayRes, unsubRes] = await Promise.all([
        supabase.from("email_campaigns").select("sent_count, opened_count, clicked_count, bounced_count, failed_count"),
        supabase.from("email_queue").select("status").eq("status", "pending"),
        supabase.from("email_queue").select("id").eq("status", "sent").gte("sent_at", new Date().toISOString().split("T")[0]),
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
        pending: queueRes.data?.length || 0,
        sentToday: todayRes.data?.length || 0,
        unsubscribed: unsubRes.count || 0,
        openRate: totals.sent > 0 ? ((totals.opened / totals.sent) * 100).toFixed(1) : "0",
        clickRate: totals.opened > 0 ? ((totals.clicked / totals.opened) * 100).toFixed(1) : "0",
      };
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Métricas de Email</h2>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
