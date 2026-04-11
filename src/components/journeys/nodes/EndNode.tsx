import { Handle, Position } from "@xyflow/react";
import { Flag } from "lucide-react";

export function EndNode({ selected }: any) {
  return (
    <div
      className={`px-3 py-2 rounded-xl border-2 min-w-[120px] bg-card transition-all ${
        selected ? "border-red-500 shadow-glow" : "border-red-500/30"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <Flag className="w-4 h-4 text-red-500" />
        <span className="text-sm font-medium">Fim</span>
      </div>
    </div>
  );
}
