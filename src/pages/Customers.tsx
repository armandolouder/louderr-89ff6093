import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Users, BarChart3, Grid3X3 } from "lucide-react";
import { ImportWizard } from "@/components/campaigns/ImportWizard";
import { ClustersDashboard } from "@/components/campaigns/ClustersDashboard";
import { SendLogs } from "@/components/campaigns/SendLogs";
import { RFMMatrix } from "@/components/customers/RFMMatrix";

export default function Customers() {
  const [activeTab, setActiveTab] = useState("import");

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card/50 p-4 md:p-6">
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Importe clientes, segmente com IA e visualize seus clusters
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
            <TabsTrigger value="rfm" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Matriz RFM</span>
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

          <TabsContent value="rfm" className="mt-0">
            <RFMMatrix />
          </TabsContent>

          <TabsContent value="logs" className="mt-0">
            <SendLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
