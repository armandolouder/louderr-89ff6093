import { cn } from "@/lib/utils";
import { MessageCircle, Instagram } from "lucide-react";

interface ChannelBadgeProps {
  channel: "whatsapp" | "instagram";
  size?: "sm" | "md";
}

export function ChannelBadge({ channel, size = "sm" }: ChannelBadgeProps) {
  const Icon = channel === "whatsapp" ? MessageCircle : Instagram;
  
  return (
    <span
      className={cn(
        "badge-channel",
        channel === "whatsapp" && "channel-whatsapp",
        channel === "instagram" && "channel-instagram",
        size === "md" && "px-3 py-1 text-sm"
      )}
    >
      <Icon className={cn("flex-shrink-0", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
      <span className="capitalize">{channel}</span>
    </span>
  );
}
