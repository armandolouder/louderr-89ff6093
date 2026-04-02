import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Users, TrendingUp, Loader2, RefreshCw, CloudDownload, MessageCircle, Mail, MapPin, ShoppingBag, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface RFMCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  rfm_recency: number;
  rfm_frequency: number;
  rfm_monetary: number;
  rfm_score: string;
  total_spent: number;
  order_count: number;
  last_purchase_at: string | null;
  favorite_product: string | null;
  favorite_category: string | null;
  region: string | null;
  state: string | null;
  city: string | null;
}

type Segment = {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
};

const getSegment = (r: number, f: number, m: number): Segment => {
  if (r >= 4 && f >= 4 && m >= 4) return { label: "Campeões", emoji: "🏆", color: "text-yellow-300", bgColor: "bg-yellow-500/20 border-yellow-500/40", description: "Compram frequentemente, gastam muito e compraram recentemente" };
  if (r >= 4 && f >= 3) return { label: "Clientes Fiéis", emoji: "❤️", color: "text-rose-300", bgColor: "bg-rose-500/20 border-rose-500/40", description: "Compram com frequência e recentemente" };
  if (r >= 3 && f >= 3 && m >= 3) return { label: "Potencial Alto", emoji: "⭐", color: "text-blue-300", bgColor: "bg-blue-500/20 border-blue-500/40", description: "Bons em todas as métricas, podem se tornar campeões" };
  if (r >= 3 && m >= 4) return { label: "Alto Valor", emoji: "💎", color: "text-purple-300", bgColor: "bg-purple-500/20 border-purple-500/40", description: "Gastam muito, manter engajados" };
  if (r <= 2 && f >= 3) return { label: "Em Risco", emoji: "⚠️", color: "text-orange-300", bgColor: "bg-orange-500/20 border-orange-500/40", description: "Compravam muito, mas sumiram recentemente" };
  if (r <= 2 && f <= 2 && m <= 2) return { label: "Hibernando", emoji: "💤", color: "text-gray-400", bgColor: "bg-gray-500/20 border-gray-500/40", description: "Baixa atividade em todas as métricas" };
  if (r <= 2) return { label: "Perdidos", emoji: "🔴", color: "text-red-300", bgColor: "bg-red-500/20 border-red-500/40", description: "Não compram há muito tempo" };
  return { label: "Promissores", emoji: "🌱", color: "text-emerald-300", bgColor: "bg-emerald-500/20 border-emerald-500/40", description: "Novos clientes com potencial" };
};

const CELL_COLORS: Record<string, string> = {
  "Campeões": "bg-yellow-500",
  "Clientes Fiéis": "bg-rose-500",
  "Potencial Alto": "bg-blue-500",
  "Alto Valor": "bg-purple-500",
  "Em Risco": "bg-orange-500",
  "Hibernando": "bg-gray-500",
  "Perdidos": "bg-red-500",
  "Promissores": "bg-emerald-500",
};

const SEGMENT_RGBA: Record<string, string> = {
  "Campeões": "rgba(234,179,8,",
  "Clientes Fiéis": "rgba(244,63,94,",
  "Potencial Alto": "rgba(59,130,246,",
  "Alto Valor": "rgba(168,85,247,",
  "Em Risco": "rgba(249,115,22,",
  "Hibernando": "rgba(107,114,128,",
  "Perdidos": "rgba(239,68,68,",
  "Promissores": "rgba(16,185,129,",
};

export function RFMMatrix() {
  const [customers, setCustomers] = useState<RFMCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ total: number; synced: number; status: string } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<RFMCustomer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("imported_customers")
      .select("id, name, email, phone, rfm_recency, rfm_frequency, rfm_monetary, rfm_score, total_spent, order_count, last_purchase_at, favorite_product, favorite_category, region, state, city")
      .not("rfm_score", "is", null)
      .order("total_spent", { ascending: false });
    setCustomers((data as RFMCustomer[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCustomerDetail = async (customer: RFMCustomer) => {
    setSelectedCustomer(customer);
    setLoadingOrders(true);
    setCustomerOrders([]);

    // Fetch orders for this customer from nuvemshop_orders
    if (customer.phone) {
      const phone = customer.phone;
      const lastDigits = phone.slice(-8);
      const { data: orders } = await supabase
        .from("nuvemshop_orders")
        .select("*")
        .or(`customer_phone.eq.${phone},customer_phone.like.%${lastDigits}%`)
        .order("order_date", { ascending: false })
        .limit(20);
      setCustomerOrders(orders || []);
    } else if (customer.email) {
      const { data: orders } = await supabase
        .from("nuvemshop_orders")
        .select("*")
        .eq("customer_email", customer.email)
        .order("order_date", { ascending: false })
        .limit(20);
      setCustomerOrders(orders || []);
    }
    setLoadingOrders(false);
  };

  const sendWhatsApp = (phone: string, name: string) => {
    const firstName = name.split(" ")[0];
    const msg = encodeURIComponent(`Olá ${firstName}! `);
    navigate(`/campaigns?tab=individual&phone=${phone}&msg=${msg}`);
  };

  const startSync = async () => {
    setSyncing(true);
    setSyncProgress({ total: 0, synced: 0, status: "Iniciando..." });
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sync-nuvemshop-customers`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || "Erro ao iniciar sincronização");
        setSyncing(false);
        return;
      }

      toast.info("Sincronização iniciada! Importando 100 clientes por vez...");
      const jobId = result.job_id;

      const poll = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/sync-nuvemshop-customers?job_id=${jobId}`
          );
          const statusData = await statusRes.json();

          setSyncProgress({
            total: statusData.total_rows || 0,
            synced: statusData.valid_rows || 0,
            status: statusData.status === "completed"
              ? "Concluído!"
              : statusData.status === "failed"
              ? `Erro: ${statusData.error_message}`
              : `Importando... ${statusData.valid_rows || 0}/${statusData.total_rows || "?"} clientes`,
          });

          if (statusData.status === "completed") {
            clearInterval(poll);
            toast.success(`Sincronização concluída! ${statusData.valid_rows} clientes com RFM calculado.`);
            setSyncing(false);
            fetchData();
          } else if (statusData.status === "failed") {
            clearInterval(poll);
            toast.error(statusData.error_message || "Falha na sincronização");
            setSyncing(false);
          }
        } catch {
          // continue polling
        }
      }, 4000);
    } catch (error) {
      toast.error("Erro de conexão ao iniciar sincronização");
      setSyncing(false);
    }
  };

  const segmentMap = useMemo(() => {
    const map: Record<string, RFMCustomer[]> = {};
    customers.forEach((c) => {
      const seg = getSegment(c.rfm_recency, c.rfm_frequency, c.rfm_monetary);
      if (!map[seg.label]) map[seg.label] = [];
      map[seg.label].push(c);
    });
    return map;
  }, [customers]);

  const matrix = useMemo(() => {
    const grid: { r: number; f: number; count: number; segment: Segment; avgMonetary: number }[][] = [];
    for (let r = 5; r >= 1; r--) {
      const row: typeof grid[0] = [];
      for (let f = 1; f <= 5; f++) {
        const matching = customers.filter((c) => c.rfm_recency === r && c.rfm_frequency === f);
        const avgM = matching.length ? matching.reduce((s, c) => s + c.rfm_monetary, 0) / matching.length : 3;
        row.push({ r, f, count: matching.length, segment: getSegment(r, f, Math.round(avgM)), avgMonetary: avgM });
      }
      grid.push(row);
    }
    return grid;
  }, [customers]);

  const segments = useMemo(() => {
    const unique = new Map<string, { segment: Segment; count: number; totalSpent: number }>();
    customers.forEach((c) => {
      const seg = getSegment(c.rfm_recency, c.rfm_frequency, c.rfm_monetary);
      const existing = unique.get(seg.label);
      if (existing) { existing.count++; existing.totalSpent += Number(c.total_spent || 0); }
      else unique.set(seg.label, { segment: seg, count: 1, totalSpent: Number(c.total_spent || 0) });
    });
    return Array.from(unique.values()).sort((a, b) => b.count - a.count);
  }, [customers]);

  const maxCellCount = useMemo(() => Math.max(1, ...matrix.flat().map((c) => c.count)), [matrix]);
  const filteredCustomers = selectedSegment ? segmentMap[selectedSegment] || [] : [];

  return (
    <div className="space-y-6">
      {/* Sync header */}
      <Card className="border-primary/20">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CloudDownload className="w-5 h-5 text-primary" />
              Sincronizar Nuvemshop
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Importa 100 clientes por vez e calcula os scores RFM automaticamente.
              {customers.length > 0 && ` Atualmente ${customers.length} clientes com RFM.`}
            </p>
            {syncProgress && syncing && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-muted-foreground">{syncProgress.status}</span>
              </div>
            )}
          </div>
          <Button onClick={startSync} disabled={syncing} className="shrink-0">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {syncing ? "Sincronizando..." : "Sincronizar Tudo"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !customers.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Nenhum dado RFM disponível</h3>
            <p className="text-muted-foreground text-sm mt-1">Clique em "Sincronizar Tudo" para importar clientes da Nuvemshop e calcular RFM.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Segment cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {segments.map(({ segment, count, totalSpent }) => (
              <Card
                key={segment.label}
                className={`cursor-pointer transition-all border ${
                  selectedSegment === segment.label ? segment.bgColor + " ring-2 ring-primary" : "hover:border-primary/30"
                }`}
                onClick={() => setSelectedSegment(selectedSegment === segment.label ? null : segment.label)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{segment.emoji}</span>
                    <span className="text-sm font-medium text-foreground">{segment.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{count}</div>
                  <div className="text-xs text-muted-foreground">
                    R$ {totalSpent.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>



          {/* Customer list */}
          {selectedSegment && filteredCustomers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {getSegment(filteredCustomers[0].rfm_recency, filteredCustomers[0].rfm_frequency, filteredCustomers[0].rfm_monetary).emoji}{" "}
                  {selectedSegment}
                  <Badge variant="secondary" className="ml-auto">{filteredCustomers.length} clientes</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead>UF</TableHead>
                        <TableHead className="text-right">Total Gasto</TableHead>
                        <TableHead className="text-right">Pedidos</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.slice(0, 100).map((c) => (
                        <TableRow
                          key={c.id}
                          className="cursor-pointer hover:bg-accent/50"
                          onClick={() => openCustomerDetail(c)}
                        >
                          <TableCell className="font-medium whitespace-nowrap">{c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{c.email || "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {c.phone ? (
                              <a
                                href={`https://wa.me/${c.phone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {c.phone}
                              </a>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{c.state || "—"}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">R$ {Number(c.total_spent || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{c.order_count}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {c.phone && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                                  onClick={(e) => { e.stopPropagation(); sendWhatsApp(c.phone!, c.name); }}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); openCustomerDetail(c); }}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredCustomers.length > 100 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Mostrando 100 de {filteredCustomers.length} clientes</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Customer Detail Sheet */}
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => { if (!open) setSelectedCustomer(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedCustomer && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedCustomer.name}
                  {(() => {
                    const seg = getSegment(selectedCustomer.rfm_recency, selectedCustomer.rfm_frequency, selectedCustomer.rfm_monetary);
                    return <Badge className="text-xs">{seg.emoji} {seg.label}</Badge>;
                  })()}
                </SheetTitle>
                <SheetDescription>
                  RFM: R={selectedCustomer.rfm_recency} F={selectedCustomer.rfm_frequency} M={selectedCustomer.rfm_monetary}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Contact info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Contato</h4>
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${selectedCustomer.email}`} className="text-primary hover:underline">
                        {selectedCustomer.email}
                      </a>
                    </div>
                  )}
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <a
                        href={`https://wa.me/${selectedCustomer.phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline"
                      >
                        {selectedCustomer.phone}
                      </a>
                    </div>
                  )}
                  {(selectedCustomer.city || selectedCustomer.state || selectedCustomer.region) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {[selectedCustomer.city, selectedCustomer.state, selectedCustomer.region].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-lg font-bold text-foreground">
                        R$ {Number(selectedCustomer.total_spent || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Total Gasto</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-lg font-bold text-foreground">{selectedCustomer.order_count}</div>
                      <div className="text-[10px] text-muted-foreground">Pedidos</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-lg font-bold text-foreground">
                        {selectedCustomer.last_purchase_at
                          ? new Date(selectedCustomer.last_purchase_at).toLocaleDateString("pt-BR")
                          : "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Última Compra</div>
                    </CardContent>
                  </Card>
                </div>


                {/* Orders */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Pedidos Recentes
                  </h4>
                  {loadingOrders ? (
                    <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Carregando pedidos...
                    </div>
                  ) : customerOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Nenhum pedido encontrado localmente.</p>
                  ) : (
                    <div className="space-y-2">
                      {customerOrders.map((order: any) => (
                        <Card key={order.id} className="border-border/50">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium text-foreground">
                                  #{order.order_number || "—"}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {order.order_date ? new Date(order.order_date).toLocaleDateString("pt-BR") : ""}
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-foreground">
                                R$ {Number(order.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {order.products && Array.isArray(order.products) && order.products.length > 0 && (
                              <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
                                {order.products.map((p: any, i: number) => (
                                  <div key={i}>{p.name || p.product_name || "Produto"}</div>
                                ))}
                              </div>
                            )}
                            <div className="mt-1 flex gap-2">
                              {order.status && (
                                <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                              )}
                              {order.payment_status && (
                                <Badge variant="outline" className="text-[10px]">{order.payment_status}</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {selectedCustomer.phone && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => sendWhatsApp(selectedCustomer.phone!, selectedCustomer.name)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Enviar WhatsApp
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
