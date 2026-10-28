import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callPrintbee } from "@/lib/printbeeTracking";
import { OrderTrackingDetails } from "@/components/tracking/OrderTrackingDetails";
import logo from "@/assets/louder-meta-cover.png";

export default function PublicOrderTracking() {
  const { linkId } = useParams();
  const query = useQuery({ queryKey: ["public-printbee-tracking", linkId], queryFn: () => {
    if (!linkId) throw new Error("Link de rastreio inválido.");
    return callPrintbee({ action: "view", linkId });
  }, retry: false, staleTime: 60000 });
  return <div className="min-h-dvh bg-background text-foreground">
    <header className="bg-sidebar border-b border-border py-6 flex justify-center"><img src={logo} alt="LOUDER.ink" className="h-20 w-52 object-contain" /></header>
    <main className="mx-auto max-w-2xl px-5 py-8 sm:py-10">
      {query.isLoading ? <div role="status" className="flex gap-3 items-center justify-center py-16"><Loader2 className="animate-spin text-primary" /> Consultando seu pedido…</div> : query.isError ? <section className="py-10 space-y-5 text-center"><PackageSearch className="mx-auto h-10 w-10 text-muted-foreground" /><h1 className="text-2xl">Rastreio indisponível</h1><p role="alert" className="text-muted-foreground">{query.error.message}</p><Button onClick={() => query.refetch()} className="rounded-none"><RefreshCw /> Tentar novamente</Button></section> : query.data && <>
        <div className="mb-8 flex items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground mb-2">Acompanhamento do pedido</p><h1 className="text-2xl font-semibold break-all">{query.data.tracking.orderNSU}</h1></div><Button variant="outline" size="icon" className="rounded-none shrink-0" disabled={query.isFetching} onClick={() => query.refetch()} title="Atualizar rastreio" aria-label="Atualizar rastreio"><RefreshCw className={query.isFetching ? "animate-spin" : ""} /></Button></div>
        {query.data.warning && <p role="status" className="mb-6 border-l-4 border-warning bg-muted p-4 text-sm">{query.data.warning}</p>}
        <OrderTrackingDetails tracking={query.data.tracking} updatedAt={query.data.updatedAt} />
      </>}
    </main>
  </div>;
}