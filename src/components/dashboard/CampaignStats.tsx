import { Send, CheckCircle, XCircle, Zap } from "lucide-react";
import { useCampaignPerformance } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface CampaignStatsProps {
  sentMessages: number;
  failedMessages: number;
  successRate: number;
  activeCampaigns: number;
}

export function CampaignStats({ 
  sentMessages, 
  failedMessages, 
  successRate, 
  activeCampaigns 
}: CampaignStatsProps) {
  const { data: campaigns, isLoading } = useCampaignPerformance();

  return (
    <div className="stat-card rounded-lg h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Performance de Campanhas</h3>
        </div>
        {activeCampaigns > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
            <Zap className="w-3 h-3" />
            {activeCampaigns} ativa{activeCampaigns > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-success mb-1">
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-foreground">{sentMessages}</p>
          <p className="text-xs text-muted-foreground">Enviadas</p>
        </div>
        <div className="text-center p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-destructive mb-1">
            <XCircle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-foreground">{failedMessages}</p>
          <p className="text-xs text-muted-foreground">Falhas</p>
        </div>
        <div className="text-center p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <Zap className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-foreground">{successRate}%</p>
          <p className="text-xs text-muted-foreground">Sucesso</p>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Últimas campanhas</p>
        
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          campaigns.map((campaign, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
            >
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium text-foreground truncate">
                  {campaign.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress 
                    value={campaign.successRate} 
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {campaign.successRate}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{campaign.sent}</p>
                <p className="text-xs text-muted-foreground">enviadas</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nenhuma campanha ainda
          </div>
        )}
      </div>
    </div>
  );
}
