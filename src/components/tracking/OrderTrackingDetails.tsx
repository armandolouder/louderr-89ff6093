import { Truck, Package, ExternalLink, MapPin, CheckCircle2, Clock, Factory, ListChecks, Info, Hourglass, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trackingDate, printbeeStatus, type PrintbeeTracking } from "@/lib/printbeeTracking";
import { trackingStages } from "@/lib/trackingTimeline";

export async function copyTracking(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Código de rastreio copiado!", { duration: 2500 });
  } catch {
    toast.error("Não foi possível copiar. Selecione e copie o código manualmente.");
  }
}

export function OrderTrackingDetails({ tracking, updatedAt }: { tracking: PrintbeeTracking; updatedAt: string }) {
  const stages = trackingStages(tracking);

  const events = [
    {
      title: "Em Separação",
      description: "Pedido recebido! Os materiais já estão sendo preparados para produção.",
      date: tracking.saleDate,
      icon: ListChecks,
      completed: Boolean(tracking.saleDate),
    },
    {
      title: "Em Produção",
      description: stages.production ? "Seu produto personalizado está sendo confeccionado." : "Aguardando início da confecção.",
      date: null,
      icon: Factory,
      completed: stages.production,
    },
    {
      title: "Coleta Transportadora",
      description: stages.dispatched
        ? "Pedido coletado e despachado com sucesso."
        : stages.collection
        ? "Seu pedido está pronto aguardando a retirada da transportadora."
        : "Aguardando conclusão da produção.",
      date: stages.automaticCollection ? stages.collectionDueAt : null,
      automatic: stages.automaticCollection,
      icon: Package,
      completed: stages.collection,
    },
    {
      title: "Rastreamento",
      description: stages.dispatched
        ? "Pacote postado e a caminho da distribuição."
        : tracking.trackingCode
        ? "Código de rastreamento oficial disponível."
        : "Fase de Logística.",
      date: tracking.postedAt,
      icon: Truck,
      completed: Boolean(tracking.trackingCode) || stages.dispatched,
    },
    {
      title: "Em Trânsito",
      description: stages.transit ? "Seu pedido está em rota de entrega para seu endereço." : "Seu pedido está em transporte para a sua região.",
      date: null,
      forecast: !stages.transit ? "Previsão: Em breve" : null,
      icon: MapPin,
      completed: stages.transit,
    },
    {
      title: "Entregue",
      description: stages.delivered ? "Pacote entregue com sucesso no endereço cadastrado!" : "Aguardando chegada final no endereço.",
      date: tracking.deliveredAt,
      forecast: !stages.delivered ? `Previsão máxima: ${trackingDate(tracking.deliveryDate)}` : null,
      icon: CheckCircle2,
      completed: stages.delivered,
    },
  ];

  const isStore = (n?: string | null) => !n || /^louder(\.ink)?$/i.test(n.trim());
  const clientName = (!isStore(tracking.recipientName) ? tracking.recipientName : null)
    || (!isStore(tracking.customerName) ? tracking.customerName : null);
  const addressStreet = [tracking.street, tracking.number].filter(Boolean).join(", ");
  const addressStreetComp = [addressStreet, tracking.complement].filter(Boolean).join(" - ");
  const addressCityState = [tracking.city, tracking.state].filter(Boolean).join(" - ");
  const hasAnyAddress = Boolean(tracking.street || tracking.address || tracking.district || tracking.city || tracking.state || tracking.zipCode || clientName);


  return (
    <div className="tracking-theme space-y-4 sm:space-y-6">
      {/* Notice Card Amarelo */}
      <div className="rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 bg-amber-50/95 border border-amber-300 text-amber-950 text-xs sm:text-sm leading-relaxed shadow-sm">
        <div className="p-2 rounded-xl bg-amber-200/90 text-amber-900 shrink-0 mt-0.5">
          <Info className="h-4 w-4" />
        </div>
        <p className="font-medium text-amber-950">
          Entre a confecção e a entrega final, seu pedido passa pela logística das transportadoras parceiras, podendo chegar antes da estimativa. Acompanhe as etapas abaixo!
        </p>
      </div>

      {/* Timeline Section */}
      <section className="tracking-glass rounded-3xl p-5 sm:p-7 space-y-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-900">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <MapPin className="h-4 w-4" />
            </div>
            Etapas da Entrega
          </h2>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100/80 px-2.5 py-1 rounded-full">
            Linha do tempo
          </span>
        </div>

        {stages.stopped && (
          <div role="status" className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs sm:text-sm">
            Status do pedido: <strong>{printbeeStatus(tracking.orderStatus)}</strong>
          </div>
        )}

        <ol className="relative pl-1 sm:pl-2">
          {events.map((event, index) => (
            <li key={event.title} data-stage={event.title} data-active={event.completed} className="relative flex gap-3.5 sm:gap-4 pb-8 last:pb-1">
              {index < events.length - 1 && (
                <span
                  className={`absolute bottom-0 left-[18px] top-10 w-0.5 transition-colors duration-500 ${
                    event.completed && events[index + 1]?.completed
                      ? "bg-gradient-to-b from-emerald-500 to-teal-500"
                      : "bg-slate-200/80"
                  }`}
                />
              )}

              {/* Node Icon */}
              <div
                className={`relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                  event.completed
                    ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/25 ring-4 ring-emerald-500/10"
                    : "bg-slate-100/90 text-slate-400 border border-slate-200/80"
                }`}
              >
                <event.icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5 space-y-1">
                <h3 className={`text-sm sm:text-base font-bold leading-tight ${event.completed ? "text-slate-900" : "text-slate-400"}`}>
                  {event.title}
                </h3>

                {/* Tracking code on a SECOND LINE */}
                {event.title === "Rastreamento" && tracking.trackingCode && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Código:</span>
                      <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm tracking-wider select-all">
                        {tracking.trackingCode}
                      </span>
                    </div>

                    {tracking.trackingUrl && (
                      <a
                        href={tracking.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white/90 hover:bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs transition-all active:scale-95"
                      >
                        Ver no site
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {event.description}
                </p>

                {event.date && (
                  <p className="pt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200/60">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      {trackingDate(
                        event.date,
                        !/^\d{4}-\d{2}-\d{2}$/.test(event.date) && !(event.automatic && /^\d{4}-\d{2}-\d{2}$/.test(tracking.saleDate || ""))
                      )}
                      {event.automatic && " — Adicionado no sistema"}
                    </span>
                  </p>
                )}

                {event.forecast && (
                  <p className="pt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <Hourglass className="h-3.5 w-3.5 text-amber-600" />
                    {event.forecast}
                  </p>
                )}

                {event.title === "Rastreamento" && tracking.carrierName && (
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                      <Truck className="h-3.5 w-3.5 text-emerald-600" />
                      {tracking.carrierName} responsável pelo envio
                    </span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Shipping Details Section */}
      <section className="tracking-glass rounded-3xl p-5 sm:p-7 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-900 pb-2 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
            <Truck className="h-4 w-4" />
          </div>
          <h2>Informações de Envio</h2>
        </div>

        {/* Carrier & Forecast Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 backdrop-blur-sm space-y-0.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Transportadora</span>
            <p className="font-bold text-slate-900 text-sm sm:text-base">{tracking.carrierName || "Ainda não informada"}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 backdrop-blur-sm space-y-0.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Previsão máxima</span>
            <p className="font-bold text-slate-900 text-sm sm:text-base">{trackingDate(tracking.deliveryDate)}</p>
          </div>
        </div>

        {/* Highlighted Tracking Code Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/70 to-teal-50/50 border border-emerald-500/20 shadow-xs">
          <div className="min-w-0 space-y-0.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-800">Código de rastreio</span>
            <p className="font-mono font-bold text-slate-900 text-base sm:text-xl tracking-wider select-all break-all">
              {tracking.trackingCode || "Fase de Logística"}
            </p>
          </div>
        </div>

        {tracking.trackingUrl && (
          <Button
            asChild
            className="rounded-2xl w-full py-4 h-auto min-h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/25 active:scale-[0.99] transition-all"
          >
            <a href={tracking.trackingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
              <ExternalLink className="h-4 w-4" /> Rastrear no site da transportadora
            </a>
          </Button>
        )}
      </section>

      {/* Delivery Address Section */}
      {hasAnyAddress && (
        <section className="tracking-glass rounded-3xl p-5 sm:p-7 space-y-3.5 shadow-sm">
          <div className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-900 pb-2 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <MapPin className="h-4 w-4" />
            </div>
            <h3>Endereço de Entrega</h3>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
            {clientName && (
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <User className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{clientName}</span>
              </div>
            )}

            {addressStreetComp && <p className="text-sm font-semibold text-slate-800">{addressStreetComp}</p>}

            {tracking.district && <p className="text-sm text-slate-600">Bairro: {tracking.district}</p>}

            {addressCityState && <p className="text-sm font-medium text-slate-700">{addressCityState}</p>}

            {tracking.zipCode && (
              <div className="pt-1">
                <span className="text-xs font-mono font-bold text-slate-600 bg-white/90 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                  CEP: {tracking.zipCode}
                </span>
              </div>
            )}

            {!addressStreetComp && tracking.address && <p className="text-sm text-slate-700">{tracking.address}</p>}
          </div>
        </section>
      )}


    </div>
  );
}