import { cn } from "@/lib/utils";
import { ChannelBadge } from "./ChannelBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation } from "@/hooks/useConversations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreHorizontal, FolderInput, FolderX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCustomTabs, useMoveToTab, CustomTab } from "@/hooks/useCustomTabs";
import { toast } from "sonner";

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
  const { data: tabs = [] } = useCustomTabs();
  const moveToTab = useMoveToTab();

  const initials = conversation.contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedTime = conversation.last_message_at 
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: ptBR })
    : "";

  const currentTab = tabs.find((t) => t.id === conversation.tab_id);

  const handleMoveToTab = async (tabId: string | null, tabName: string) => {
    try {
      await moveToTab.mutateAsync({ conversationId: conversation.id, tabId });
      toast.success(tabId ? `Movido para "${tabName}"` : "Removido da aba");
    } catch (error) {
      toast.error("Erro ao mover conversa");
    }
  };

  return (
    <div
      className={cn("conversation-item group", isActive && "active")}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar className="w-12 h-12">
          {conversation.contact.avatar_url && (
            <AvatarImage 
              src={conversation.contact.avatar_url} 
              alt={conversation.contact.name}
              className="object-cover"
            />
          )}
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
          {currentTab && (
            <span 
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${currentTab.color}20`, color: currentTab.color }}
            >
              {currentTab.name}
            </span>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground truncate">{conversation.last_message || "Sem mensagens"}</p>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        {conversation.unread_count > 0 && (
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
            {conversation.unread_count}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {tabs.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderInput className="h-4 w-4 mr-2" />
                  Mover para aba
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {tabs.map((tab) => (
                    <DropdownMenuItem
                      key={tab.id}
                      onClick={() => handleMoveToTab(tab.id, tab.name)}
                      disabled={conversation.tab_id === tab.id}
                    >
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: tab.color }}
                      />
                      {tab.name}
                      {conversation.tab_id === tab.id && (
                        <span className="ml-auto text-xs text-muted-foreground">atual</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            
            {conversation.tab_id && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMoveToTab(null, "")}>
                  <FolderX className="h-4 w-4 mr-2" />
                  Remover da aba
                </DropdownMenuItem>
              </>
            )}

            {tabs.length === 0 && !conversation.tab_id && (
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground text-sm">Crie uma aba primeiro</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
