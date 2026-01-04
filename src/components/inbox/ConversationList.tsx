import { useState } from "react";
import { Search, Filter, MessageCircle, Instagram } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConversationItem, Conversation } from "./ConversationItem";
import { cn } from "@/lib/utils";

const mockConversations: Conversation[] = [
  {
    id: "1",
    contactName: "Maria Silva",
    contactPhone: "+55 11 98765-4321",
    lastMessage: "Olá, gostaria de saber sobre o pedido #12345",
    timestamp: "14:32",
    unread: 3,
    channel: "whatsapp",
    status: "novo",
  },
  {
    id: "2",
    contactName: "João Santos",
    lastMessage: "Vocês entregam para fora do estado?",
    timestamp: "14:28",
    unread: 0,
    channel: "instagram",
    status: "em_atendimento",
    assignee: "Carlos",
  },
  {
    id: "3",
    contactName: "Ana Costa",
    contactPhone: "+55 21 99876-5432",
    lastMessage: "Perfeito, vou aguardar então!",
    timestamp: "13:45",
    unread: 0,
    channel: "whatsapp",
    status: "aguardando",
    assignee: "Fernanda",
  },
  {
    id: "4",
    contactName: "Pedro Lima",
    lastMessage: "Muito obrigado pelo suporte!",
    timestamp: "12:20",
    unread: 0,
    channel: "instagram",
    status: "finalizado",
    assignee: "Carlos",
  },
  {
    id: "5",
    contactName: "Julia Oliveira",
    contactPhone: "+55 31 91234-5678",
    lastMessage: "Qual o prazo de entrega?",
    timestamp: "11:55",
    unread: 1,
    channel: "whatsapp",
    status: "novo",
  },
];

interface ConversationListProps {
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "instagram">("all");

  const filteredConversations = mockConversations.filter((conv) => {
    const matchesSearch = conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = channelFilter === "all" || conv.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-4 border-b border-border space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        
        <div className="flex gap-2">
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
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {filteredConversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={selectedId === conversation.id}
            onClick={() => onSelect(conversation)}
          />
        ))}
      </div>
    </div>
  );
}
