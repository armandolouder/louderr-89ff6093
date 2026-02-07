import { cn } from "@/lib/utils";
import { ChannelBadge } from "./ChannelBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Conversation } from "@/hooks/useConversations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const initials = conversation.contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedTime = conversation.last_message_at 
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: ptBR })
    : "";

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
          <h4 className="font-medium text-foreground truncate">{conversation.contact.name}</h4>
          <span className="text-xs text-muted-foreground flex-shrink-0">{formattedTime}</span>
        </div>
        
        <div className="flex items-center gap-2 mb-1.5">
          <ChannelBadge channel={conversation.channel} />
          {conversation.assignee_name && (
            <span className="text-xs text-muted-foreground">• {conversation.assignee_name}</span>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground truncate">{conversation.last_message || "Sem mensagens"}</p>
      </div>
      
      {conversation.unread_count > 0 && (
        <div className="flex-shrink-0">
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
            {conversation.unread_count}
          </span>
        </div>
      )}
    </div>
  );
}
