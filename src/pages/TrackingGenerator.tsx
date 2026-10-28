import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link2, Loader2, Copy, ExternalLink, Truck, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callPrintbee, orderInputSchema, type TrackingResult, trackingDate } from "@/lib/printbeeTracking";
import { copyTracking, OrderTrackingDetails } from "@/components/tracking/OrderTrackingDetails";

export default function TrackingGenerator() {
  const [order, setOrder] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const history = useQuery({ queryKey: ["printbee-links"], queryFn: async () => {
    const { data, error } = await supabase.from("printbee_tracking_links").select("id,order_identifier,updated_at").order("updated_at", { ascending: false }).limit(20);
    if (error) throw error;
    return data;
  } });
  const link = result?.linkId ? `${window.location.origin}/rastreio/${result.linkId}` : "";
  async function generate(event: React.FormEvent) {
    event.preventDefault(); setError(""); setResult(null);
    const parsed = orderInputSchema.safeParse(order);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Pedido inválido."); return; }
    setBusy(true);
    try { setResult(await callPrintbee({ action: "generate", order: parsed.data })); await history.refetch(); }
    catch (error) { setError(error instanceof Error ? error.message : "Não foi possível gerar o rastreio."); }
    finally { setBusy(false); }
  }
  return <div className="p-6 lg:p-8 space-y-8 max-w-5xl">
    <header><h1 className="text-2xl font-semibold flex items-center gap-3"><Truck className="text-primary" /> Gerador de Rastreio</h1><p className="mt-1 text-sm text-muted-foreground">Printbee · LOUDER.ink</p></header>
    <form onSubmit={generate} className="max-w-xl space-y-3">
      <Label htmlFor="printbee-order">Pedido Printbee</Label>
      <div className="flex flex-col sm:flex-row gap-3"><Input id="printbee-order" placeholder="BEE00004696" value={order} onChange={e => setOrder(e.target.value)} maxLength={11} className="rounded-none h-11 font-mono" disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? "tracking-error" : undefined} /><Button type="submit" disabled={busy} className="h-11 rounded-none shrink-0">{busy ? <Loader2 className="animate-spin" /> : <Link2 />}{busy ? "Consultando…" : "Gerar link"}</Button></div>
      {error && <p id="tracking-error" role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
    {result && <section className="max-w-2xl space-y-6 border-t border-border pt-6">
      <h2 className="font-semibold text-xl">Pedido {result.tracking.orderNSU}</h2>
      <div className="space-y-2"><Label htmlFor="tracking-link">Link de acompanhamento</Label><div className="flex gap-2"><Input id="tracking-link" value={link} readOnly className="rounded-none" /><Button variant="outline" size="icon" className="rounded-none shrink-0" title="Copiar link" aria-label="Copiar link" onClick={() => copyTracking(link)}><Copy /></Button><Button asChild variant="outline" size="icon" className="rounded-none shrink-0"><a href={link} target="_blank" rel="noopener noreferrer" aria-label="Abrir rastreio" title="Abrir rastreio"><ExternalLink /></a></Button></div></div>
      <OrderTrackingDetails tracking={result.tracking} updatedAt={result.updatedAt} />
    </section>}
    <section className="border-t border-border pt-6"><div className="flex justify-between items-center mb-4"><h2 className="font-semibold">Links recentes</h2><Button size="icon" variant="ghost" className="rounded-none" aria-label="Atualizar links" title="Atualizar links" onClick={() => history.refetch()}><RefreshCw /></Button></div>
      {history.isLoading ? <p className="text-muted-foreground text-sm">Carregando…</p> : history.isError ? <p role="alert" className="text-destructive text-sm">Não foi possível carregar os links.</p> : !history.data?.length ? <p className="text-muted-foreground text-sm">Nenhum rastreio gerado ainda.</p> : <ul className="divide-y divide-border">{history.data.map(item => <li key={item.id} className="flex justify-between items-center gap-3 py-3"><div><p className="font-mono text-sm">{item.order_identifier}</p><p className="text-xs text-muted-foreground">{trackingDate(item.updated_at, true)}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" className="rounded-none" aria-label={`Copiar link ${item.order_identifier}`} title="Copiar link" onClick={() => copyTracking(`${window.location.origin}/rastreio/${item.id}`)}><Copy /></Button><Button size="icon" variant="ghost" asChild className="rounded-none"><a href={`/rastreio/${item.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${item.order_identifier}`} title="Abrir rastreio"><ExternalLink /></a></Button></div></li>)}</ul>}
    </section>
  </div>;
}