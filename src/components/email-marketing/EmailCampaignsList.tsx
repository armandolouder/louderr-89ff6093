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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Send, Clock, CheckCircle, XCircle, Mail, Users, Eye, ArrowRight,
  ArrowLeft, CalendarDays, Sparkles, Trash2, BarChart3, TestTube, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CampaignDetailView } from "./CampaignDetailView";
import { SendTestEmail } from "./SendTestEmail";

export function EmailCampaignsList() {
  const queryClient = useQueryClient();
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", template_id: "", cluster_ids: [] as string[],
    scheduled_at: "", subject_override: "",
  });

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
        .select("*")
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

  const selectedTemplate = templates?.find((t) => t.id === form.template_id);
  const totalRecipients = clusters?.filter((c) => form.cluster_ids.includes(c.id)).reduce((sum, c) => sum + (c.customer_count || 0), 0) || 0;
  const estimatedDays = Math.ceil(totalRecipients / 250);

  const createAndLaunchMutation = useMutation({
    mutationFn: async () => {
      // Create campaign
      const { data: campaign, error: createError } = await supabase.from("email_campaigns").insert({
        name: form.name,
        description: form.description || null,
        template_id: form.template_id || null,
        cluster_ids: form.cluster_ids,
        subject_override: form.subject_override || null,
        scheduled_at: form.scheduled_at || null,
        status: form.scheduled_at ? "scheduled" : "sending",
      }).select().single();
      if (createError) throw createError;

      if (!form.template_id) throw new Error("Selecione um template");
      const template = templates?.find((t) => t.id === form.template_id);
      if (!template) throw new Error("Template não encontrado");

      // Get unsubscribed
      const { data: unsubscribed } = await supabase.from("email_unsubscribes").select("email");
      const unsubs = new Set((unsubscribed || []).map((u) => u.email));

      // Get customers - handle potentially large datasets
      let allCustomers: any[] = [];
      for (const clusterId of form.cluster_ids) {
        let from = 0;
        const pageSize = 1000;
        while (true) {
          const { data: batch } = await supabase
            .from("imported_customers")
            .select("id, name, email")
            .eq("cluster_id", clusterId)
            .not("email", "is", null)
            .range(from, from + pageSize - 1);
          if (!batch?.length) break;
          allCustomers = allCustomers.concat(batch);
          if (batch.length < pageSize) break;
          from += pageSize;
        }
      }

      const validCustomers = allCustomers.filter((c) => c.email && !unsubs.has(c.email));
      if (!validCustomers.length) throw new Error("Nenhum cliente válido encontrado");

      const scheduledAt = form.scheduled_at ? new Date(form.scheduled_at).toISOString() : new Date().toISOString();

      // Build unsubscribe URL
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const unsubUrl = `https://${projectId}.supabase.co/functions/v1/email-unsubscribe`;

      // Enqueue
      const queueItems = validCustomers.map((c) => {
        let html = template.html_content;
        let subject = form.subject_override || template.subject;
        const firstName = (c.name || "Cliente").split(" ")[0];
        const emailUnsubLink = `${unsubUrl}?email=${encodeURIComponent(c.email || "")}`;
        html = html
          .replace(/\{\{nome\}\}/gi, firstName)
          .replace(/\{\{email\}\}/gi, c.email || "")
          .replace(/\{\{unsubscribe_url\}\}/gi, emailUnsubLink);
        subject = subject.replace(/\{\{nome\}\}/gi, firstName);
        return {
          campaign_id: campaign.id,
          customer_id: c.id,
          email: c.email!,
          customer_name: c.name,
          subject,
          html_content: html,
          status: "pending",
          scheduled_at: scheduledAt,
        };
      });

      for (let i = 0; i < queueItems.length; i += 100) {
        const batch = queueItems.slice(i, i + 100);
        const { error } = await supabase.from("email_queue").insert(batch);
        if (error) throw error;
      }

      await supabase.from("email_campaigns").update({
        total_recipients: validCustomers.length,
        started_at: form.scheduled_at ? null : new Date().toISOString(),
      }).eq("id", campaign.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      setWizardStep(0);
      setForm({ name: "", description: "", template_id: "", cluster_ids: [], scheduled_at: "", subject_override: "" });
      toast.success(form.scheduled_at ? "Campanha agendada!" : "Campanha iniciada! Os emails serão enviados gradualmente.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("email_queue").delete().eq("campaign_id", id);
      const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast.success("Campanha removida!");
    },
  });

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: Clock },
    scheduled: { label: "Agendada", color: "bg-amber-500/20 text-amber-400", icon: CalendarDays },
    sending: { label: "Enviando", color: "bg-blue-500/20 text-blue-400", icon: Send },
    completed: { label: "Concluída", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle },
    failed: { label: "Falha", color: "bg-destructive/20 text-destructive", icon: XCircle },
  };

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  // Campaign detail view
  if (selectedCampaign) {
    return <CampaignDetailView campaignId={selectedCampaign} onBack={() => setSelectedCampaign(null)} />;
  }
  if (wizardStep > 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s <= wizardStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{s}</div>
              {s < 4 && <div className={`flex-1 h-0.5 ${s < wizardStep ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {["", "Informações básicas", "Escolha o template", "Selecione o público", "Revisão e envio"][wizardStep]}
        </p>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Step 1: Basic info */}
            {wizardStep === 1 && (
              <>
                <Input placeholder="Nome da campanha *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Textarea placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Agendamento (opcional)</label>
                  <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-1">Deixe em branco para enviar imediatamente.</p>
                </div>
              </>
            )}

            {/* Step 2: Template */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <Input placeholder="Assunto customizado (opcional — sobrescreve o do template)" value={form.subject_override} onChange={(e) => setForm({ ...form, subject_override: e.target.value })} />
                <div className="grid gap-3">
                  {templates?.map((t) => (
                    <Card
                      key={t.id}
                      className={`cursor-pointer transition-all ${form.template_id === t.id ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/30"}`}
                      onClick={() => setForm({ ...form, template_id: t.id })}
                    >
                      <CardContent className="flex items-center gap-4 py-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${form.template_id === t.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <Mail className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.subject}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {!templates?.length && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum template encontrado. Crie um primeiro na aba Templates.</p>
                )}
              </div>
            )}

            {/* Step 3: Clusters */}
            {wizardStep === 3 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Selecione os clusters que receberão esta campanha:</p>
                {clusters?.filter(c => c.customer_count && c.customer_count > 0).map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      form.cluster_ids.includes(c.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Checkbox
                      checked={form.cluster_ids.includes(c.id)}
                      onCheckedChange={(checked) => {
                        const ids = checked
                          ? [...form.cluster_ids, c.id]
                          : form.cluster_ids.filter((id) => id !== c.id);
                        setForm({ ...form, cluster_ids: ids });
                      }}
                    />
                    <span className="text-lg">{c.emoji}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.customer_count} clientes com email</p>
                    </div>
                  </label>
                ))}
                {form.cluster_ids.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium">📊 Resumo: {totalRecipients} destinatários</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Com limite de 250/dia, esta campanha levará ~{estimatedDays} dia{estimatedDays > 1 ? "s" : ""} para completar.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Campanha</span>
                    <span className="font-medium">{form.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Template</span>
                    <span className="font-medium">{selectedTemplate?.name || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Assunto</span>
                    <span className="font-medium text-right max-w-[60%] truncate">{form.subject_override || selectedTemplate?.subject || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Destinatários</span>
                    <span className="font-bold text-primary">{totalRecipients}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Clusters</span>
                    <span className="font-medium">{clusters?.filter((c) => form.cluster_ids.includes(c.id)).map((c) => `${c.emoji} ${c.name}`).join(", ")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envio</span>
                    <span className="font-medium">
                      {form.scheduled_at ? format(new Date(form.scheduled_at), "dd/MM/yyyy 'às' HH:mm") : "Imediato"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duração estimada</span>
                    <span className="font-medium">~{estimatedDays} dia{estimatedDays > 1 ? "s" : ""}</span>
                  </div>
                </div>

                {selectedTemplate && (
                  <div className="border rounded-lg overflow-hidden">
                    <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">Preview do email</p>
                    <iframe
                      srcDoc={selectedTemplate.html_content.replace(/\{\{nome\}\}/gi, "Maria").replace(/\{\{email\}\}/gi, "maria@email.com").replace(/\{\{unsubscribe_url\}\}/gi, "#")}
                      className="w-full h-64 border-0"
                      title="Preview"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => wizardStep === 1 ? setWizardStep(0) : setWizardStep(wizardStep - 1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> {wizardStep === 1 ? "Cancelar" : "Voltar"}
          </Button>
          {wizardStep < 4 ? (
            <Button
              onClick={() => setWizardStep(wizardStep + 1)}
              disabled={
                (wizardStep === 1 && !form.name) ||
                (wizardStep === 2 && !form.template_id) ||
                (wizardStep === 3 && !form.cluster_ids.length)
              }
            >
              Próximo <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <div className="flex gap-2">
              {selectedTemplate && (
                <Button variant="outline" onClick={() => setShowTestEmail(true)} className="gap-2">
                  <TestTube className="w-4 h-4" /> Enviar Teste
                </Button>
              )}
              <Button onClick={() => createAndLaunchMutation.mutate()} disabled={createAndLaunchMutation.isPending} className="gap-2">
                <Send className="w-4 h-4" /> {form.scheduled_at ? "Agendar Campanha" : "Enviar Agora"}
              </Button>
            </div>
          )}
        </div>

        {selectedTemplate && (
          <SendTestEmail
            open={showTestEmail}
            onOpenChange={setShowTestEmail}
            templateHtml={selectedTemplate.html_content}
            subject={form.subject_override || selectedTemplate.subject}
          />
        )}
      </div>
    );

  // Campaign list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Campanhas de Email</h2>
        <Button size="sm" onClick={() => setWizardStep(1)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Campanha
        </Button>
      </div>

      {!campaigns?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Nenhuma campanha ainda</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Crie um template primeiro, depois lance sua primeira campanha.</p>
            <Button onClick={() => setWizardStep(1)} className="gap-2"><Sparkles className="w-4 h-4" /> Criar Primeira Campanha</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const sc = statusConfig[campaign.status || "draft"];
            const StatusIcon = sc.icon;
            const progress = campaign.total_recipients ? Math.round(((campaign.sent_count || 0) / campaign.total_recipients) * 100) : 0;
            return (
              <Card key={campaign.id} className="hover:border-primary/20 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{campaign.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={sc.color}><StatusIcon className="w-3 h-3 mr-1" />{sc.label}</Badge>
                      {campaign.status === "draft" && (
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(campaign.id)} className="text-destructive h-7 w-7">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  {(campaign.status === "sending" || campaign.status === "completed") && campaign.total_recipients > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{campaign.sent_count || 0} de {campaign.total_recipients}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{campaign.total_recipients || 0}</span>
                      <span className="flex items-center gap-1"><Send className="w-3.5 h-3.5" />{campaign.sent_count || 0}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{campaign.opened_count || 0}</span>
                      {campaign.scheduled_at && (
                        <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{format(new Date(campaign.scheduled_at), "dd/MM HH:mm")}</span>
                      )}
                    </div>
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
