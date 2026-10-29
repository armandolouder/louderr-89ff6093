import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, PackageSearch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callPrintbee } from "@/lib/printbeeTracking";
import { OrderTrackingDetails } from "@/components/tracking/OrderTrackingDetails";
import logo from "@/assets/tracking-logo.webp.asset.json";

export default function PublicOrderTracking() {
  const { linkId } = useParams();
  const query = useQuery({
    queryKey: ["public-printbee-tracking", linkId],
    queryFn: () => {
      if (!linkId) throw new Error("Link de rastreio inválido.");
      return callPrintbee({ action: "view", linkId });
    },
    retry: false,
    staleTime: 60000,
    refetchInterval: 60000,
  });

  const isStore = (n?: string | null) => !n || /^louder(\.ink)?$/i.test(n.trim());
  const clientName = (!isStore(query.data?.tracking?.recipientName) ? query.data?.tracking?.recipientName : null)
    || (!isStore(query.data?.tracking?.customerName) ? query.data?.tracking?.customerName : null);
  const orderNumber = query.data?.tracking?.orderNSU?.replace(/^BEE0*/i, "") || query.data?.tracking?.orderNSU?.replace(/^BEE/i, "") || "";

  return (
    <div className="tracking-theme min-h-dvh bg-gradient-to-br from-slate-50 via-slate-100/60 to-emerald-50/30 text-slate-900 relative overflow-x-hidden selection:bg-emerald-500/20">
      {/* Decorative ambient glowing orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-32 -right-20 w-80 h-80 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      {/* Header Preto */}
      <header className="sticky top-0 z-30 bg-black text-white border-b border-zinc-800 shadow-md transition-all">
        <div className="mx-auto max-w-[620px] px-4 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo.url} alt="LOUDER.ink" className="h-9 sm:h-11 w-auto object-contain drop-shadow-sm brightness-110" />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/70 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Rastreio Oficial
            </span>
            <Button
              variant="outline"
              size="icon"
              className="rounded-2xl h-9 w-9 bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white shadow-sm transition-all"
              disabled={query.isFetching}
              onClick={() => query.refetch()}
              title="Atualizar status"
              aria-label="Atualizar status"
            >
              <RefreshCw className={`h-4 w-4 text-zinc-200 ${query.isFetching ? "animate-spin text-emerald-400" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-[620px] px-4 sm:px-6 py-6 sm:py-10 space-y-5">
        {query.isLoading ? (
          <div role="status" className="tracking-glass rounded-3xl p-12 text-center space-y-4 my-8">
            <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping opacity-60" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </div>
            <p className="font-semibold text-slate-700 text-sm">Consultando seu pedido na transportadora…</p>
            <p className="text-xs text-slate-400">Isso leva apenas alguns instantes</p>
          </div>
        ) : query.isError ? (
          <section className="tracking-glass rounded-3xl p-8 sm:p-10 space-y-5 text-center my-8">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
              <PackageSearch className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Rastreio indisponível</h1>
              <p role="alert" className="text-sm text-slate-500 max-w-sm mx-auto">{query.error.message}</p>
            </div>
            <Button
              onClick={() => query.refetch()}
              className="rounded-2xl h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-md transition-all active:scale-95"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          </section>
        ) : query.data && (
          <>
            {/* Hero Greeting Card */}
            <div className="tracking-glass rounded-3xl p-5 sm:p-7 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-500/10 border border-emerald-500/20">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  Status em tempo real
                </span>
                {orderNumber && (
                  <span className="font-mono text-xs font-semibold text-slate-500 bg-white/70 px-2.5 py-1 rounded-xl border border-slate-200/60 shadow-xs">
                    Pedido #{orderNumber}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {clientName ? `Olá, ${clientName}!` : "Olá!"}
                </h1>
                <p className="text-sm text-slate-500">
                  Acompanhe abaixo o status e o trajeto da sua entrega.
                </p>
              </div>
            </div>

            {query.data.warning && (
              <div role="status" className="tracking-glass-notice rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-sm flex items-start gap-3">
                <span className="font-bold">Aviso:</span>
                <p>{query.data.warning}</p>
              </div>
            )}

            <OrderTrackingDetails tracking={query.data.tracking} updatedAt={query.data.updatedAt} />
          </>
        )}
      </main>

      {/* Safe bottom spacing for mobile browsers */}
      <footer className="py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} LOUDER.ink · Rastreamento de entregas</p>
      </footer>
    </div>
  );
}