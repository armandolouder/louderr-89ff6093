import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, RefreshCw, Mail, MessageSquare, ExternalLink, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function AbandonedCheckouts() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [contactFilter, setContactFilter] = useState("all");
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<any>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data: checkouts, isLoading } = useQuery({
    queryKey: ["abandoned-checkouts", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nuvemshop_abandoned_checkouts")
        .select("*")
        .gte("created_at_nuvemshop", startDate)
        .lte("created_at_nuvemshop", endDate)
        .order("created_at_nuvemshop", { ascending: false })
        .limit(1000);
      if (error) throw error;

      // Also get ones without nuvemshop date
      const { data: legacy, error: e2 } = await supabase
        .from("nuvemshop_abandoned_checkouts")
        .select("*")
        .is("created_at_nuvemshop", null)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (e2) throw e2;

      return [...(data || []), ...(legacy || [])];
    },
  });

  const filteredCheckouts = useMemo(() => {
    if (!checkouts) return [];
    if (contactFilter === "all") return checkouts;
    if (contactFilter === "contacted") return checkouts.filter(c => c.contacted_at);
    if (contactFilter === "not_contacted") return checkouts.filter(c => !c.contacted_at);
    if (contactFilter === "recovered") return checkouts.filter(c => c.recovered);
    return checkouts;
  }, [checkouts, contactFilter]);

  const metrics = useMemo(() => {
    const list = checkouts || [];
    const totalValue = list.reduce((sum, c) => sum + (c.total || 0), 0);
    const totalCheckouts = list.length;
    const contacted = list.filter(c => c.contacted_at).length;
    const recovered = list.filter(c => c.recovered).length;
    const recoveryRate = totalCheckouts > 0 ? Math.round((recovered / totalCheckouts) * 100) : 0;
    return { totalValue, totalCheckouts, contacted, recovered, recoveryRate };
  }, [checkouts]);

  const handleSync = async () => {
    setSyncing(true);
    toast.info("Sincronizando carrinhos abandonados...");
    try {
      let totalSynced = 0;
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await supabase.functions.invoke(
          `sync-abandoned-checkouts?page=${page}&per_page=50`
        );
        if (res.error) throw res.error;
        totalSynced += res.data?.synced || 0;
        hasMore = res.data?.has_more || false;
        page++;
        if (page > 20) break;
      }

      toast.success(`${totalSynced} carrinhos abandonados sincronizados`);
      queryClient.invalidateQueries({ queryKey: ["abandoned-checkouts"] });
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + (err.message || "Erro desconhecido"));
    } finally {
      setSyncing(false);
    }
  };

  const markAsContacted = async (id: string, channel: string) => {
    const { error } = await supabase
      .from("nuvemshop_abandoned_checkouts")
      .update({ contacted_at: new Date().toISOString(), contact_channel: channel })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      toast.success("Marcado como contatado");
      queryClient.invalidateQueries({ queryKey: ["abandoned-checkouts"] });
    }
  };

  const markAsRecovered = async (id: string) => {
    const { error } = await supabase
      .from("nuvemshop_abandoned_checkouts")
      .update({ recovered: true })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      toast.success("Marcado como recuperado!");
      queryClient.invalidateQueries({ queryKey: ["abandoned-checkouts"] });
    }
  };

  const sendWhatsApp = async (checkout: any) => {
    if (!checkout.customer_phone) {
      toast.error("Este cliente não tem telefone cadastrado");
      return;
    }

    setSendingId(checkout.id);
    try {
      // Find active abandoned checkout flow
      const { data: flows, error: flowErr } = await supabase
        .from("automation_flows")
        .select("*")
        .eq("trigger_event", "abandoned_checkout")
        .eq("status", "active")
        .limit(1);

      if (flowErr) throw flowErr;
      if (!flows || flows.length === 0) {
        toast.error("Nenhum fluxo de 'Carrinho Abandonado' ativo. Crie um na página de Automações.");
        return;
      }

      const flow = flows[0];
      const phone = checkout.customer_phone.replace(/\D/g, "");
      const firstName = (checkout.customer_name || "Cliente").split(" ")[0];
      const products = (checkout.products as any[]) || [];
      const productsList = products.map((p: any) => `${p.quantity || 1}x ${p.name}`).join("\n");
      const recoveryUrl = checkout.recovery_url || "";
      const total = checkout.total || 0;

      const messageContent = flow.message_content
        .replace(/\[nome_cliente\]/g, firstName)
        .replace(/\[lista_produtos\]/g, productsList)
        .replace(/\[total_pedido\]/g, `R$ ${total.toFixed(2).replace(".", ",")}`)
        .replace(/\[link_recuperacao\]/g, recoveryUrl)
        .replace(/\[link_checkout\]/g, recoveryUrl);

      // Schedule immediate execution
      const { error: execError } = await supabase.from("automation_executions").insert({
        flow_id: flow.id,
        trigger_data: {
          checkout_id: checkout.checkout_id,
          event: "abandoned_checkout_manual",
          customer_name: checkout.customer_name,
          customer_phone: phone,
          message_content: messageContent,
          media_url: flow.media_url,
          media_type: flow.media_type,
        },
        scheduled_at: new Date().toISOString(),
        phone,
        customer_name: checkout.customer_name,
        status: "pending",
      });

      if (execError) throw execError;

      // Mark as contacted
      await supabase
        .from("nuvemshop_abandoned_checkouts")
        .update({ contacted_at: new Date().toISOString(), contact_channel: "whatsapp" })
        .eq("id", checkout.id);

      toast.success(`Mensagem agendada para ${firstName}! Será enviada no próximo ciclo.`);
      queryClient.invalidateQueries({ queryKey: ["abandoned-checkouts"] });
    } catch (err: any) {
      toast.error("Erro ao enviar: " + (err.message || "Erro desconhecido"));
    } finally {
      setSendingId(null);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const FILTER_OPTIONS = [
    { value: "all", label: "Todos" },
    { value: "not_contacted", label: "Não contatados" },
    { value: "contacted", label: "Contatados" },
    { value: "recovered", label: "Recuperados" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Carrinhos Abandonados</h1>
            <p className="text-sm text-muted-foreground">Recupere vendas perdidas via WhatsApp e e-mail.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </Button>

          <Select value={contactFilter} onValueChange={setContactFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month.toString()} onValueChange={v => setMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year.toString()} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="stat-card rounded-lg p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Valor Total Abandonado</p>
            <span className="text-xl font-bold text-destructive">{formatCurrency(metrics.totalValue)}</span>
          </div>
          <div className="stat-card rounded-lg p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Carrinhos</p>
            <span className="text-xl font-bold text-foreground">{metrics.totalCheckouts}</span>
          </div>
          <div className="stat-card rounded-lg p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Contatados</p>
            <span className="text-xl font-bold text-foreground">{metrics.contacted}</span>
          </div>
          <div className="stat-card rounded-lg p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Recuperados</p>
            <span className="text-xl font-bold text-foreground">{metrics.recovered}</span>
          </div>
          <div className="stat-card rounded-lg p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Taxa de Recuperação</p>
            <span className="text-xl font-bold text-foreground">{metrics.recoveryRate}%</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">Carrinhos Abandonados</h2>
          <p className="text-sm text-muted-foreground">{filteredCheckouts.length} carrinhos no período</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredCheckouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum carrinho abandonado encontrado. Clique em "Sincronizar" para buscar.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCheckouts.map(checkout => {
                  const products = checkout.products as any[];
                  const itemCount = Array.isArray(products) ? products.reduce((s: number, p: any) => s + (p.quantity || 1), 0) : 0;

                  return (
                    <TableRow key={checkout.id}>
                      <TableCell className="text-sm">
                        {new Date(checkout.created_at_nuvemshop || checkout.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{checkout.customer_name ? checkout.customer_name.split(" ")[0] : checkout.customer_email || checkout.customer_phone || "Anônimo"}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {checkout.customer_email || checkout.customer_phone || "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        {formatCurrency(checkout.total || 0)}
                      </TableCell>
                      <TableCell className="text-center">{itemCount}</TableCell>
                      <TableCell>
                        {checkout.recovered ? (
                          <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Recuperado</Badge>
                        ) : checkout.contacted_at ? (
                          <Badge variant="secondary" className="text-xs">
                            {checkout.contact_channel === "whatsapp" ? "WhatsApp" : checkout.contact_channel === "email" ? "E-mail" : "Contatado"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-destructive border-destructive/30">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {checkout.customer_phone && !checkout.contacted_at && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Enviar WhatsApp"
                              disabled={sendingId === checkout.id}
                              onClick={() => sendWhatsApp(checkout)}
                            >
                              <Send className={`w-3.5 h-3.5 text-primary ${sendingId === checkout.id ? "animate-pulse" : ""}`} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Ver produtos"
                            onClick={() => setSelectedCheckout(checkout)}
                          >
                            <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          {checkout.recovery_url && (
                            <a href={checkout.recovery_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Link de recuperação">
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedCheckout} onOpenChange={() => setSelectedCheckout(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Carrinho Abandonado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Cliente</span>
              <span>{selectedCheckout?.customer_name || "Anônimo"}</span>
              <span className="text-muted-foreground">E-mail</span>
              <span>{selectedCheckout?.customer_email || "—"}</span>
              <span className="text-muted-foreground">Telefone</span>
              <span>{selectedCheckout?.customer_phone || "—"}</span>
              <span className="text-muted-foreground">Data</span>
              <span>{selectedCheckout ? new Date(selectedCheckout.created_at_nuvemshop || selectedCheckout.created_at).toLocaleDateString("pt-BR") : ""}</span>
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-destructive">{selectedCheckout ? formatCurrency(selectedCheckout.total || 0) : ""}</span>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Produtos no Carrinho</h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center w-[60px]">Qtd</TableHead>
                      <TableHead className="text-right w-[100px]">Preço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedCheckout?.products as any[] || []).map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{p.name || "—"}</TableCell>
                        <TableCell className="text-center">{p.quantity || 1}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(p.price) || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
