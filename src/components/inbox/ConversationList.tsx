import { useState } from "react";
import { Search, MessageCircle, Instagram, Loader2, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConversationItem } from "./ConversationItem";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  filterTabId?: string | null;
  showArchived?: boolean;
  onToggleArchived?: () => void;
}

export function ConversationList({ selectedId, onSelect, filterTabId, showArchived = false, onToggleArchived }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "instagram">("all");
  
  const { data: conversations, isLoading, error } = useConversations();

  const filteredConversations = (conversations || []).filter((conv) => {
    const matchesArchived = showArchived ? conv.is_archived : !conv.is_archived;
    const matchesSearch = conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesChannel = channelFilter === "all" || conv.channel === channelFilter;
    const matchesTab = filterTabId === null || (conv as any).tab_id === filterTabId;
    return matchesArchived && matchesSearch && matchesChannel && matchesTab;
  });

  const archivedCount = (conversations || []).filter(c => c.is_archived).length;

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-4 md:p-4 p-3 border-b border-border space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border h-10"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            variant={channelFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setChannelFilter("all")}
            className={cn(channelFilter !== "all" && "border-border text-muted-foreground")}
          >
            Todos
          </Button>
          <Button
            variant={channelFilter === "whatsapp" ? "default" : "outline"}
            size="sm"
            onClick={() => setChannelFilter("whatsapp")}
            className={cn(
              channelFilter === "whatsapp" 
                ? "bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90" 
                : "border-border text-muted-foreground"
            )}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            WhatsApp
          </Button>
          <Button
            variant={channelFilter === "instagram" ? "default" : "outline"}
            size="sm"
            onClick={() => setChannelFilter("instagram")}
            className={cn(
              channelFilter === "instagram" 
                ? "bg-instagram text-instagram-foreground hover:bg-instagram/90" 
                : "border-border text-muted-foreground"
            )}
          >
            <Instagram className="w-4 h-4 mr-1" />
            Instagram
          </Button>
          {onToggleArchived && (
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={onToggleArchived}
              className={cn(
                !showArchived && "border-border text-muted-foreground",
                "relative"
              )}
            >
              <Archive className="w-4 h-4 mr-1" />
              Arquivados
              {archivedCount > 0 && !showArchived && (
                <span className="ml-1 text-xs bg-muted-foreground/20 rounded-full px-1.5">
                  {archivedCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">
            Erro ao carregar conversas
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Nenhuma conversa encontrada
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={selectedId === conversation.id}
              onClick={() => onSelect(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
}
