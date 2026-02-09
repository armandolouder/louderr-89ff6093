import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, startOfWeek, startOfMonth, format } from "date-fns";

export type PeriodFilter = "today" | "week" | "month";

interface DashboardStats {
  // Conversations
  activeConversations: number;
  newConversations: number;
  finishedConversations: number;
  totalMessages: number;
  avgResponseTime: string;
  
  // By channel
  whatsappCount: number;
  instagramCount: number;
  
  // By status
  statusNovo: number;
  statusEmAtendimento: number;
  statusAguardando: number;
  statusFinalizado: number;
  
  // Campaigns
  totalCampaigns: number;
  activeCampaigns: number;
  sentMessages: number;
  failedMessages: number;
  successRate: number;
  
  // Customers
  totalCustomers: number;
  customersWithPhone: number;
  
  // Clusters
  totalClusters: number;
}

interface HourlyData {
  hour: string;
  messages: number;
  conversations: number;
}

interface CampaignPerformance {
  name: string;
  sent: number;
  failed: number;
  successRate: number;
}

function getDateRange(period: PeriodFilter): { start: Date; end: Date } {
  const now = new Date();
  const end = now;
  
  switch (period) {
    case "today":
      return { start: startOfDay(now), end };
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end };
    case "month":
      return { start: startOfMonth(now), end };
  }
}

export function useDashboardStats(period: PeriodFilter) {
  const { start, end } = getDateRange(period);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  return useQuery({
    queryKey: ["dashboard-stats", period],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch conversations for the period
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id, channel, status, created_at, updated_at")
        .gte("updated_at", startISO)
        .lte("updated_at", endISO);

      if (convError) throw convError;

      // Count messages in period
      const { count: messagesCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      // Campaigns stats
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, status, sent_count, failed_count");

      // Send logs for period
      const { data: sendLogs } = await supabase
        .from("send_logs")
        .select("status")
        .gte("sent_at", startISO)
        .lte("sent_at", endISO);

      // Customer counts
      const { count: totalCustomers } = await supabase
        .from("imported_customers")
        .select("*", { count: "exact", head: true });

      const { count: customersWithPhone } = await supabase
        .from("imported_customers")
        .select("*", { count: "exact", head: true })
        .eq("phone_status", "valid");

      // Cluster counts
      const { count: totalClusters } = await supabase
        .from("customer_clusters")
        .select("*", { count: "exact", head: true });

      // Calculate stats
      const convList = conversations || [];
      const activeConversations = convList.filter(c => 
        c.status === "em_atendimento" || c.status === "aguardando"
      ).length;
      const newConversations = convList.filter(c => c.status === "novo").length;
      const finishedConversations = convList.filter(c => c.status === "finalizado").length;

      const whatsappCount = convList.filter(c => c.channel === "whatsapp").length;
      const instagramCount = convList.filter(c => c.channel === "instagram").length;

      const statusNovo = convList.filter(c => c.status === "novo").length;
      const statusEmAtendimento = convList.filter(c => c.status === "em_atendimento").length;
      const statusAguardando = convList.filter(c => c.status === "aguardando").length;
      const statusFinalizado = convList.filter(c => c.status === "finalizado").length;

      // Campaign stats
      const campaignList = campaigns || [];
      const activeCampaigns = campaignList.filter(c => 
        c.status === "running" || c.status === "scheduled"
      ).length;

      const logs = sendLogs || [];
      const sentMessages = logs.filter(l => l.status === "sent").length;
      const failedMessages = logs.filter(l => l.status === "failed").length;
      const successRate = logs.length > 0 
        ? Math.round((sentMessages / logs.length) * 100) 
        : 0;

      return {
        activeConversations,
        newConversations,
        finishedConversations,
        totalMessages: messagesCount || 0,
        avgResponseTime: "2m 34s", // Would need more complex calculation
        whatsappCount,
        instagramCount,
        statusNovo,
        statusEmAtendimento,
        statusAguardando,
        statusFinalizado,
        totalCampaigns: campaignList.length,
        activeCampaigns,
        sentMessages,
        failedMessages,
        successRate,
        totalCustomers: totalCustomers || 0,
        customersWithPhone: customersWithPhone || 0,
        totalClusters: totalClusters || 0,
      };
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useHourlyActivity(period: PeriodFilter) {
  const { start, end } = getDateRange(period);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  return useQuery({
    queryKey: ["dashboard-hourly", period],
    queryFn: async (): Promise<HourlyData[]> => {
      const { data: messages } = await supabase
        .from("messages")
        .select("created_at")
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      // Group by hour
      const hourlyMap = new Map<string, number>();
      
      // Initialize hours for today
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, "0") + ":00";
        hourlyMap.set(hour, 0);
      }

      (messages || []).forEach(msg => {
        const hour = format(new Date(msg.created_at), "HH:00");
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
      });

      return Array.from(hourlyMap.entries())
        .map(([hour, messages]) => ({
          hour,
          messages,
          conversations: 0,
        }))
        .filter(d => {
          const h = parseInt(d.hour.split(":")[0]);
          return h >= 8 && h <= 20;
        });
    },
  });
}

export function useCampaignPerformance() {
  return useQuery({
    queryKey: ["dashboard-campaigns"],
    queryFn: async (): Promise<CampaignPerformance[]> => {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, name, sent_count, failed_count, status")
        .order("created_at", { ascending: false })
        .limit(5);

      return (campaigns || []).map(c => ({
        name: c.name,
        sent: c.sent_count || 0,
        failed: c.failed_count || 0,
        successRate: c.sent_count 
          ? Math.round(((c.sent_count - (c.failed_count || 0)) / c.sent_count) * 100)
          : 0,
      }));
    },
  });
}

export function useRecentAlerts() {
  return useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: async () => {
      // Conversations waiting too long
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data: waitingLong } = await supabase
        .from("conversations")
        .select("id")
        .eq("status", "aguardando")
        .lt("updated_at", tenMinutesAgo);

      // Failed sends in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentFails } = await supabase
        .from("send_logs")
        .select("id")
        .eq("status", "failed")
        .gte("sent_at", oneHourAgo);

      return {
        waitingConversations: waitingLong?.length || 0,
        recentFailures: recentFails?.length || 0,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
