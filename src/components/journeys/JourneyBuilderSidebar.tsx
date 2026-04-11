import { Zap, Mail, MessageSquare, Clock, Flag } from "lucide-react";

const blocks = [
  { type: "trigger", label: "Trigger", icon: Zap, color: "text-primary" },
  { type: "message", label: "Email", icon: Mail, color: "text-blue-500", channel: "email" },
  { type: "message", label: "WhatsApp", icon: MessageSquare, color: "text-green-500", channel: "whatsapp" },
  { type: "delay", label: "Delay", icon: Clock, color: "text-amber-500" },
  { type: "end", label: "Fim", icon: Flag, color: "text-red-500" },
];

export function JourneyBuilderSidebar() {
  const onDragStart = (e: React.DragEvent, block: (typeof blocks)[0]) => {
    e.dataTransfer.setData("application/reactflow-type", block.type);
    e.dataTransfer.setData("application/reactflow-channel", block.channel || "");
    e.dataTransfer.setData("application/reactflow-label", block.label);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-44 md:w-52 border-r border-border bg-card/50 p-2.5 space-y-1.5 flex-shrink-0 overflow-y-auto">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Componentes</h3>
      {blocks.map((block) => (
        <div
          key={block.label}
          draggable
          onDragStart={(e) => onDragStart(e, block)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
        >
          <block.icon className={`w-4 h-4 ${block.color}`} />
          <span className="text-sm font-medium">{block.label}</span>
        </div>
      ))}
    </div>
  );
}
