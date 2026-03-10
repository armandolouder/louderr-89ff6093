import { useState } from "react";
import { Search, Instagram, Loader2, Archive } from "lucide-react";
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
        
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            variant={channelFilter === "all" && !showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => { setChannelFilter("all"); if (showArchived && onToggleArchived) onToggleArchived(); }}
            className={cn("h-8 px-3", channelFilter !== "all" || showArchived ? "border-border text-muted-foreground" : "")}
          >
            Todos
          </Button>
          <Button
            variant={channelFilter === "whatsapp" && !showArchived ? "default" : "outline"}
            size="icon"
            onClick={() => { setChannelFilter("whatsapp"); if (showArchived && onToggleArchived) onToggleArchived(); }}
            className={cn(
              "h-8 w-8",
              channelFilter === "whatsapp" && !showArchived
                ? "bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90" 
                : "border-border text-muted-foreground"
            )}
            title="WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </Button>
          <Button
            variant={channelFilter === "instagram" && !showArchived ? "default" : "outline"}
            size="icon"
            onClick={() => { setChannelFilter("instagram"); if (showArchived && onToggleArchived) onToggleArchived(); }}
            className={cn(
              "h-8 w-8",
              channelFilter === "instagram" && !showArchived
                ? "bg-instagram text-instagram-foreground hover:bg-instagram/90" 
                : "border-border text-muted-foreground"
            )}
            title="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </Button>
          {onToggleArchived && (
            <Button
              variant={showArchived ? "default" : "outline"}
              size="icon"
              onClick={onToggleArchived}
              className={cn(
                "h-8 w-8 relative",
                !showArchived && "border-border text-muted-foreground"
              )}
              title="Arquivados"
            >
              <Archive className="w-4 h-4" />
              {archivedCount > 0 && !showArchived && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
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
