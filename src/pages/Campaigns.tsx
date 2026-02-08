import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Users, Send, BarChart3 } from "lucide-react";
import { ImportWizard } from "@/components/campaigns/ImportWizard";
import { ClustersDashboard } from "@/components/campaigns/ClustersDashboard";
import { CampaignsList } from "@/components/campaigns/CampaignsList";
import { SendLogs } from "@/components/campaigns/SendLogs";

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState("import");

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card/50 p-4 md:p-6">
        <h1 className="text-2xl font-bold text-foreground">Campanhas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Importe clientes, segmente com IA e envie campanhas controladas via WhatsApp
        </p>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Importar</span>
            </TabsTrigger>
            <TabsTrigger value="clusters" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clusters</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Campanhas</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-0">
            <ImportWizard onComplete={() => setActiveTab("clusters")} />
          </TabsContent>

          <TabsContent value="clusters" className="mt-0">
            <ClustersDashboard />
          </TabsContent>

          <TabsContent value="campaigns" className="mt-0">
            <CampaignsList />
          </TabsContent>

          <TabsContent value="logs" className="mt-0">
            <SendLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
