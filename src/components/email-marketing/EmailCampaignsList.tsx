import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Send, Clock, CheckCircle, XCircle, Mail, Users } from "lucide-react";
import { toast } from "sonner";

export function EmailCampaignsList() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", description: "", template_id: "", cluster_ids: [] as string[] });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["email-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name, subject")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: clusters } = useQuery({
    queryKey: ["email-clusters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_clusters")
        .select("id, name, emoji, customer_count");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_campaigns").insert({
        name: newCampaign.name,
        description: newCampaign.description || null,
        template_id: newCampaign.template_id || null,
        cluster_ids: newCampaign.cluster_ids,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      setShowCreate(false);
      setNewCampaign({ name: "", description: "", template_id: "", cluster_ids: [] });
      toast.success("Campanha criada com sucesso!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const launchMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const campaign = campaigns?.find((c) => c.id === campaignId);
      if (!campaign) throw new Error("Campanha não encontrada");
      if (!campaign.template_id) throw new Error("Selecione um template primeiro");
      if (!campaign.cluster_ids?.length) throw new Error("Selecione pelo menos um cluster");

      // Get template
      const { data: template } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", campaign.template_id)
        .single();
      if (!template) throw new Error("Template não encontrado");

      // Get customers from selected clusters, excluding unsubscribed
      const { data: unsubscribed } = await supabase.from("email_unsubscribes").select("email");
      const unsubs = new Set((unsubscribed || []).map((u) => u.email));

      const { data: customers } = await supabase
        .from("imported_customers")
        .select("id, name, email")
        .in("cluster_id", campaign.cluster_ids)
        .not("email", "is", null);

      const validCustomers = (customers || []).filter((c) => c.email && !unsubs.has(c.email));
      if (!validCustomers.length) throw new Error("Nenhum cliente válido encontrado");

      // Enqueue emails
      const queueItems = validCustomers.map((c) => {
        let html = template.html_content;
        let subject = campaign.subject_override || template.subject;
        const firstName = (c.name || "Cliente").split(" ")[0];
        html = html.replace(/\{\{nome\}\}/gi, firstName).replace(/\{\{email\}\}/gi, c.email || "");
        subject = subject.replace(/\{\{nome\}\}/gi, firstName);

        return {
          campaign_id: campaignId,
          customer_id: c.id,
          email: c.email!,
          customer_name: c.name,
          subject,
          html_content: html,
          status: "pending",
        };
      });

      // Insert in batches of 100
      for (let i = 0; i < queueItems.length; i += 100) {
        const batch = queueItems.slice(i, i + 100);
        const { error } = await supabase.from("email_queue").insert(batch);
        if (error) throw error;
      }

      // Update campaign status
      await supabase
        .from("email_campaigns")
        .update({
          status: "sending",
          total_recipients: validCustomers.length,
          started_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast.success("Campanha iniciada! Os emails serão enviados gradualmente.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: Clock },
    sending: { label: "Enviando", color: "bg-blue-500/20 text-blue-400", icon: Send },
    completed: { label: "Concluída", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle },
    failed: { label: "Falha", color: "bg-destructive/20 text-destructive", icon: XCircle },
  };

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Campanhas de Email</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Campanha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nome da campanha"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              />
              <Textarea
                placeholder="Descrição (opcional)"
                value={newCampaign.description}
                onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              />
              <Select
                value={newCampaign.template_id}
                onValueChange={(v) => setNewCampaign({ ...newCampaign, template_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} — {t.subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div>
                <p className="text-sm font-medium mb-2">Clusters alvo</p>
                <div className="space-y-2">
                  {clusters?.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCampaign.cluster_ids.includes(c.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...newCampaign.cluster_ids, c.id]
                            : newCampaign.cluster_ids.filter((id) => id !== c.id);
                          setNewCampaign({ ...newCampaign, cluster_ids: ids });
                        }}
                        className="rounded"
                      />
                      {c.emoji} {c.name} ({c.customer_count})
                    </label>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newCampaign.name || createMutation.isPending}
                className="w-full"
              >
                Criar Campanha
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!campaigns?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Nenhuma campanha ainda</h3>
            <p className="text-sm text-muted-foreground mt-1">Crie um template primeiro, depois crie sua campanha.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const sc = statusConfig[campaign.status || "draft"];
            const StatusIcon = sc.icon;
            return (
              <Card key={campaign.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{campaign.name}</CardTitle>
                    <Badge className={sc.color}><StatusIcon className="w-3 h-3 mr-1" />{sc.label}</Badge>
                  </div>
                  {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{campaign.total_recipients || 0} destinatários</span>
                      <span className="flex items-center gap-1"><Send className="w-3.5 h-3.5" />{campaign.sent_count || 0} enviados</span>
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{campaign.opened_count || 0} abertos</span>
                    </div>
                    {campaign.status === "draft" && (
                      <Button size="sm" variant="default" onClick={() => launchMutation.mutate(campaign.id)} disabled={launchMutation.isPending}>
                        <Send className="w-4 h-4 mr-1" /> Enviar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
