import { CalendarCheck, Truck, Package, Copy, ExternalLink, MapPin, CheckCircle2, Clock, Factory, ListChecks, Info, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trackingDate, printbeeStatus, type PrintbeeTracking } from "@/lib/printbeeTracking";
import { trackingStages } from "@/lib/trackingTimeline";

export async function copyTracking(value: string) {
  try { await navigator.clipboard.writeText(value); toast.success("Copiado!"); }
  catch { toast.error("Não foi possível copiar. Selecione e copie o texto."); }
}
export function OrderTrackingDetails({ tracking, updatedAt }: { tracking: PrintbeeTracking; updatedAt: string }) {
  const stages = trackingStages(tracking);
  const events = [
    { title: "Em Separação", description: "Pedido recebido! Os materiais já estão sendo separados para a fabricação.", date: tracking.saleDate, icon: ListChecks, completed: Boolean(tracking.saleDate) },
    { title: "Em Produção", description: stages.production ? "Seu pedido está sendo fabricado" : "Aguardando início da fabricação", date: null, icon: Factory, completed: stages.production },
    { title: "Coleta Transportadora", description: stages.dispatched ? "Seu pedido já foi despachado" : stages.collection ? "Seu pedido está aguardando a coleta da transportadora" : "Aguardando conclusão da produção", date: stages.automaticCollection ? stages.collectionDueAt : null, automatic: stages.automaticCollection, icon: Package, completed: stages.collection },
    { title: "Rastreamento", description: stages.dispatched ? "Seu pedido foi despachado" : tracking.trackingCode ? "Código de rastreio disponível" : "Aguardando código de rastreio", date: tracking.postedAt, icon: Truck, completed: Boolean(tracking.trackingCode) || stages.dispatched },
    { title: "Em Trânsito", description: stages.transit ? "Seu pedido está a caminho do seu endereço" : "Seu pedido está a caminho da sua região", date: null, forecast: !stages.transit ? "Previsão: Em breve" : null, icon: MapPin, completed: stages.transit },
    { title: "Entregue", description: stages.delivered ? "Seu pedido foi entregue" : "Aguardando chegada no endereço", date: tracking.deliveredAt, forecast: !stages.delivered ? `Previsão: ${trackingDate(tracking.deliveryDate)}` : null, icon: CheckCircle2, completed: stages.delivered },
  ];
  return <div className="tracking-theme space-y-6">
    <div className="space-y-3">
      <div className="border border-border border-l-4 border-l-primary bg-muted px-4 py-5 flex items-center gap-4"><span className="bg-accent p-3 text-primary"><CalendarCheck className="h-5 w-5" /></span><div><p className="text-sm uppercase font-semibold text-muted-foreground">{stages.delivered ? "Entregue em" : "Previsão de entrega"}</p><p className="mt-1 text-xl font-bold">{trackingDate(tracking.deliveredAt || tracking.deliveryDate)}</p></div></div>
      <div className="tracking-notice border p-4 flex items-start gap-3 text-sm leading-relaxed"><Info className="h-5 w-5 shrink-0 mt-0.5" /><p>Entre a produção e a entrega, passamos por um processo logístico, podendo o pedido chegar antes no seu endereço. Acompanhe sempre!</p></div>
    </div>
    <section className="border-y border-border py-6 sm:px-6">
      <h2 className="mb-7 flex items-center gap-3 text-lg font-bold"><MapPin className="h-5 w-5 text-primary" />Acompanhe seu pedido</h2>
      {stages.stopped && <p role="status" className="mb-6 border-l-4 border-warning bg-muted p-4">Status do pedido: {printbeeStatus(tracking.orderStatus)}</p>}
      <ol>{events.map((event, index) => <li key={event.title} data-stage={event.title} data-active={event.completed} className="relative flex gap-3 pb-10 last:pb-0">
        {index < events.length - 1 && <span className={`absolute bottom-0 left-4 top-8 w-0.5 ${event.completed && events[index + 1]?.completed ? "bg-primary" : "bg-border"}`} />}
        <span className={`relative flex h-[34px] w-[34px] shrink-0 items-center justify-center border-2 ${event.completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}><event.icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><h3 className={`text-lg font-bold leading-6 ${event.completed ? "text-foreground" : "text-muted-foreground"}`}>{event.title}{event.title === "Rastreamento" && tracking.trackingCode && <> (<a className="text-primary underline break-all" href={tracking.trackingUrl || undefined} target="_blank" rel="noopener noreferrer">{tracking.trackingCode}{tracking.trackingUrl && <ExternalLink className="inline h-4 w-4" />}</a>)</>}</h3><p className="mt-1 text-sm text-muted-foreground leading-relaxed">{event.description}</p>
          {event.date && <p className="mt-2 flex items-start gap-1.5 text-sm font-bold"><Clock className="mt-0.5 h-4 w-4 shrink-0" /><span>{trackingDate(event.date, !/^\d{4}-\d{2}-\d{2}$/.test(event.date))}{event.automatic && " — Adicionado no sistema"}</span></p>}
          {event.forecast && <p className="mt-2 flex items-start gap-1.5 text-sm font-bold text-muted-foreground"><Hourglass className="h-4 w-4 shrink-0 mt-0.5" />{event.forecast}</p>}
          {event.title === "Rastreamento" && tracking.carrierName && <p className="mt-2 flex items-center gap-2 text-primary text-sm font-bold uppercase"><Truck className="h-5 w-5" />{tracking.carrierName} responsável</p>}
        </div>
      </li>)}</ol>
    </section>
    <section className="py-2 space-y-4 sm:px-6">
      <h2 className="mb-6 flex items-center gap-3 text-lg font-bold"><Truck className="h-6 w-6 text-secondary" /> Informações de Envio</h2>
      <dl className="space-y-4">
        <div className="border-l-4 border-secondary bg-muted p-4"><dt className="text-xs uppercase font-semibold text-muted-foreground">Transportadora</dt><dd className="mt-2 font-bold">{tracking.carrierName || "Ainda não informada"}</dd></div>
        <div className="border-l-4 border-secondary bg-muted p-4 flex items-center justify-between gap-3"><div className="min-w-0"><dt className="text-xs uppercase font-semibold text-muted-foreground">Código de rastreio</dt><dd className="mt-2 font-bold break-all">{tracking.trackingCode || "Ainda não disponível"}</dd></div>{tracking.trackingCode && <Button variant="outline" size="icon" className="shrink-0 rounded-none h-8 w-8" title="Copiar código de rastreio" aria-label="Copiar código de rastreio" onClick={() => copyTracking(tracking.trackingCode || "")}><Copy className="h-4 w-4" /></Button>}</div>
      </dl>
      {tracking.trackingUrl && <Button asChild className="rounded-none w-full h-auto min-h-14 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-3 text-center whitespace-normal"><a href={tracking.trackingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="shrink-0" /> Rastrear no site da transportadora</a></Button>}
      <dl><div className="border-l-4 border-border bg-muted p-4"><dt className="text-xs uppercase font-semibold text-muted-foreground">Previsão de entrega</dt><dd className="mt-2 font-bold">{trackingDate(tracking.deliveryDate)}</dd></div></dl>
    </section>
    {(tracking.city || tracking.state) && <section className="border-t border-border pt-6 sm:px-6"><h2 className="text-lg font-bold">Destino da Entrega</h2><p className="mt-2 text-sm text-muted-foreground">{[tracking.city, tracking.state].filter(Boolean).join(" — ")}</p></section>}
    <p className="pt-4 text-xs text-muted-foreground sm:px-6">Última atualização: {trackingDate(updatedAt, true)}</p>
  </div>;
}