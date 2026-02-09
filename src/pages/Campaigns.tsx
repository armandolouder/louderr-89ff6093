import { CampaignsList } from "@/components/campaigns/CampaignsList";

export default function Campaigns() {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card/50 p-4 md:p-6">
        <h1 className="text-2xl font-bold text-foreground">Campanhas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crie e gerencie suas campanhas de WhatsApp
        </p>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <CampaignsList />
      </div>
    </div>
  );
}
