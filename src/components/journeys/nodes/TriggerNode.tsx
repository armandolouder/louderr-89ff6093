import { Handle, Position } from "@xyflow/react";
import { Zap } from "lucide-react";

const TRIGGER_LABELS: Record<string, string> = {
  visit: "Visita ao site",
  cart: "Carrinho abandonado",
  purchase: "Compra realizada",
  payment_pending: "Pagamento pendente",
  payment_confirmed: "Pagamento confirmado",
  packed: "Pedido embalado",
  shipped: "Pedido enviado",
  delivered: "Pedido entregue",
};

export function TriggerNode({ data, selected }: any) {
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 min-w-[180px] transition-all ${
        selected
          ? "border-primary shadow-glow bg-primary/10"
          : "border-primary/40 bg-card"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Trigger</p>
          <p className="text-sm font-medium">{TRIGGER_LABELS[data.triggerEvent] || data.label}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3" />
    </div>
  );
}
