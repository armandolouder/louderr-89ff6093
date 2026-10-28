import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callPrintbee } from "@/lib/printbeeTracking";
import { OrderTrackingDetails } from "@/components/tracking/OrderTrackingDetails";
import logo from "@/assets/tracking-logo.webp.asset.json";

export default function PublicOrderTracking() {
  const { linkId } = useParams();
  const query = useQuery({ queryKey: ["public-printbee-tracking", linkId], queryFn: () => {
    if (!linkId) throw new Error("Link de rastreio inválido.");
    return callPrintbee({ action: "view", linkId });
  }, retry: false, staleTime: 60000, refetchInterval: 60000 });
  return <div className="tracking-theme min-h-dvh bg-background text-foreground">
    <header className="tracking-header py-6 flex justify-center"><img src={logo.url} alt="LOUDER.ink" className="h-[72px] w-44 object-contain" /></header>
    <main className="mx-auto max-w-[610px] px-5 py-10 sm:py-14">
      {query.isLoading ? <div role="status" className="flex gap-3 items-center justify-center py-16"><Loader2 className="animate-spin text-primary" /> Consultando seu pedido…</div> : query.isError ? <section className="py-10 space-y-5 text-center"><PackageSearch className="mx-auto h-10 w-10 text-muted-foreground" /><h1 className="text-2xl">Rastreio indisponível</h1><p role="alert" className="text-muted-foreground">{query.error.message}</p><Button onClick={() => query.refetch()} className="rounded-none"><RefreshCw /> Tentar novamente</Button></section> : query.data && <>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {(query.data.tracking.customerName || query.data.tracking.recipientName)
                ? `Olá, ${query.data.tracking.customerName || query.data.tracking.recipientName}!`
                : "Olá!"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground break-words">Acompanhe o status do seu pedido #{query.data.tracking.orderNSU?.replace(/^BEE/i, "")}</p>
          </div>
          <Button variant="outline" size="icon" className="rounded-none shrink-0" disabled={query.isFetching} onClick={() => query.refetch()} title="Atualizar rastreio" aria-label="Atualizar rastreio"><RefreshCw className={query.isFetching ? "animate-spin" : ""} /></Button>
        </div>
        {query.data.warning && <p role="status" className="mb-6 border-l-4 border-warning bg-muted p-4 text-sm">{query.data.warning}</p>}
        <OrderTrackingDetails tracking={query.data.tracking} updatedAt={query.data.updatedAt} />
      </>}
    </main>
  </div>;
}