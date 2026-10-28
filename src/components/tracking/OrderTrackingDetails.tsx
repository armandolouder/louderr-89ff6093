import { CalendarCheck, Truck, Package, Copy, ExternalLink, MapPin, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trackingDate, printbeeStatus, type PrintbeeTracking } from "@/lib/printbeeTracking";

export async function copyTracking(value: string) {
  try { await navigator.clipboard.writeText(value); toast.success("Copiado!"); }
  catch { toast.error("Não foi possível copiar. Selecione e copie o texto."); }
}
export function OrderTrackingDetails({ tracking, updatedAt }: { tracking: PrintbeeTracking; updatedAt: string }) {
  const events = [
    { title: "Pedido recebido", detail: tracking.saleDate ? trackingDate(tracking.saleDate) : null, icon: Package, completed: Boolean(tracking.saleDate) },
    { title: "Status do pedido", detail: printbeeStatus(tracking.orderStatus), icon: Clock, completed: Boolean(tracking.orderStatus) },
    { title: "Envio", detail: tracking.postedAt ? trackingDate(tracking.postedAt, true) : "Postagem ainda não informada", icon: Truck, completed: Boolean(tracking.postedAt) },
    { title: "Entrega", detail: tracking.deliveredAt ? trackingDate(tracking.deliveredAt, true) : "Aguardando entrega", icon: CheckCircle2, completed: Boolean(tracking.deliveredAt) },
  ];
  return <div className="space-y-8">
    <section className="border-l-4 border-primary bg-muted/40 px-5 py-4">
      <div className="flex items-center gap-3"><CalendarCheck className="h-6 w-6 text-primary" /><div>
        <p className="text-sm text-muted-foreground">{tracking.deliveredAt ? "Entregue em" : "Previsão de entrega"}</p>
        <p className="text-xl font-semibold">{trackingDate(tracking.deliveredAt || tracking.deliveryDate)}</p>
      </div></div>
    </section>
    <section>
      <h2 className="mb-5 text-lg font-semibold">Acompanhe seu pedido</h2>
      <ol className="space-y-0">{events.map((event, index) => <li key={event.title} className="relative flex gap-4 pb-7 last:pb-0">
        {index < events.length - 1 && <span className="absolute bottom-0 left-4 top-8 w-px bg-border" />}
        <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center ${event.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><event.icon className="h-4 w-4" /></span>
        <div className="min-w-0"><h3 className="font-semibold">{event.title}</h3><p className="mt-1 text-sm text-muted-foreground break-words">{event.detail || "Data ainda não informada"}</p></div>
      </li>)}</ol>
    </section>
    <section className="border-t border-border pt-6 space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Truck className="h-5 w-5 text-primary" /> Informações de envio</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-xs uppercase text-muted-foreground">Transportadora</dt><dd className="mt-1 font-semibold">{tracking.carrierName || "Ainda não informada"}</dd></div>
        <div><dt className="text-xs uppercase text-muted-foreground">Código de rastreio</dt><dd className="mt-1 flex items-center gap-2 min-w-0"><span className="font-semibold break-all">{tracking.trackingCode || "Ainda não disponível"}</span>{tracking.trackingCode && <Button variant="ghost" size="icon" className="shrink-0 rounded-none" title="Copiar código de rastreio" aria-label="Copiar código de rastreio" onClick={() => copyTracking(tracking.trackingCode || "")}><Copy /></Button>}</dd></div>
      </dl>
      {tracking.shipmentStatus && <p className="text-sm">{tracking.shipmentStatus}</p>}
      {tracking.trackingUrl && <Button asChild className="rounded-none w-full sm:w-auto"><a href={tracking.trackingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink /> Rastrear na transportadora</a></Button>}
      {(tracking.city || tracking.state) && <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{[tracking.city, tracking.state].filter(Boolean).join(" — ")}</p>}
    </section>
    <p className="border-t border-border pt-4 text-xs text-muted-foreground">Última atualização: {trackingDate(updatedAt, true)}</p>
  </div>;
}