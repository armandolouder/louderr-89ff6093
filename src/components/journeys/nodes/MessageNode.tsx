import { Handle, Position } from "@xyflow/react";
import { Mail, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function MessageNode({ data, selected }: any) {
  const channel = data.channel || "email";
  const ChannelIcon = channel === "whatsapp" ? MessageSquare : Mail;
  const channelColor = channel === "whatsapp" ? "text-green-500" : "text-blue-500";
  const borderColor = selected ? "border-primary shadow-glow" : "border-border";

  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[200px] bg-card transition-all ${borderColor}`}>
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <ChannelIcon className={`w-4 h-4 ${channelColor}`} />
        <span className="text-sm font-medium truncate">{data.label || "Mensagem"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="text-[10px]">
          {channel === "both" ? "Email + WA" : channel === "whatsapp" ? "WhatsApp" : "Email"}
        </Badge>
        {data.templateName && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{data.templateName}</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3" />
    </div>
  );
}
