import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, GalleryHorizontalEnd } from "lucide-react";
import { CampaignsList } from "@/components/campaigns/CampaignsList";
import { CarouselBuilder } from "@/components/campaigns/CarouselBuilder";
import { useState } from "react";

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState("campaigns");

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card/50 p-4 md:p-6">
        <h1 className="text-2xl font-bold text-foreground">Campanhas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crie e gerencie suas campanhas de WhatsApp
        </p>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Campanhas</span>
            </TabsTrigger>
            <TabsTrigger value="carousel" className="flex items-center gap-2">
              <GalleryHorizontalEnd className="w-4 h-4" />
              <span className="hidden sm:inline">Carrossel</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-0">
            <CampaignsList />
          </TabsContent>

          <TabsContent value="carousel" className="mt-0">
            <CarouselBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
