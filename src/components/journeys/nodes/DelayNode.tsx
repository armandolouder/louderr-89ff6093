import { Handle, Position } from "@xyflow/react";
import { Clock } from "lucide-react";

const UNIT_LABELS: Record<string, string> = {
  minutes: "min",
  hours: "h",
  days: "dias",
};

export function DelayNode({ data, selected }: any) {
  const val = data.delayValue || 1;
  const unit = UNIT_LABELS[data.delayUnit || "hours"] || "h";

  return (
    <div
      className={`px-3 py-2 rounded-xl border-2 min-w-[130px] bg-card transition-all ${
        selected ? "border-amber-500 shadow-glow" : "border-amber-500/30"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium">
          Esperar {val} {unit}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3" />
    </div>
  );
}
