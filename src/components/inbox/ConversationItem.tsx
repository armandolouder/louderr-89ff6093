import { cn } from "@/lib/utils";
import { ChannelBadge } from "./ChannelBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface Conversation {
  id: string;
  contactName: string;
  contactPhone?: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  channel: "whatsapp" | "instagram";
  status: "novo" | "em_atendimento" | "aguardando" | "finalizado";
  assignee?: string;
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick?: () => void;
}

const statusColors = {
  novo: "bg-primary",
  em_atendimento: "bg-accent",
  aguardando: "bg-warning",
  finalizado: "bg-muted",
};

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const initials = conversation.contactName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn("conversation-item", isActive && "active")}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background",
            statusColors[conversation.status]
          )}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="font-medium text-foreground truncate">{conversation.contactName}</h4>
          <span className="text-xs text-muted-foreground flex-shrink-0">{conversation.timestamp}</span>
        </div>
        
        <div className="flex items-center gap-2 mb-1.5">
          <ChannelBadge channel={conversation.channel} />
          {conversation.assignee && (
            <span className="text-xs text-muted-foreground">• {conversation.assignee}</span>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
      </div>
      
      {conversation.unread > 0 && (
        <div className="flex-shrink-0">
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
            {conversation.unread}
          </span>
        </div>
      )}
    </div>
  );
}
