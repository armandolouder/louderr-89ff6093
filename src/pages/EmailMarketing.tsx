import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, FileText, BarChart3, Ban } from "lucide-react";
import { EmailCampaignsList } from "@/components/email-marketing/EmailCampaignsList";
import { EmailTemplateEditor } from "@/components/email-marketing/EmailTemplateEditor";
import { EmailDashboard } from "@/components/email-marketing/EmailDashboard";
import { EmailUnsubscribes } from "@/components/email-marketing/EmailUnsubscribes";

export default function EmailMarketing() {
  const [activeTab, setActiveTab] = useState("campaigns");

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card/50 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Email Marketing</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Campanhas de email para todos os seus clusters • Limite: 250/dia
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Campanhas</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="unsubscribes" className="flex items-center gap-2">
              <Ban className="w-4 h-4" />
              <span className="hidden sm:inline">Opt-out</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-0">
            <EmailCampaignsList />
          </TabsContent>
          <TabsContent value="templates" className="mt-0">
            <EmailTemplateEditor />
          </TabsContent>
          <TabsContent value="dashboard" className="mt-0">
            <EmailDashboard />
          </TabsContent>
          <TabsContent value="unsubscribes" className="mt-0">
            <EmailUnsubscribes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
