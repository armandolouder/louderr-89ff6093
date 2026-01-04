import { useState } from "react";
import { Send, Paperclip, Smile, MoreVertical, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChannelBadge } from "./ChannelBadge";
import { Conversation } from "./ConversationItem";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  timestamp: string;
  sender: "contact" | "agent";
}

const mockMessages: Message[] = [
  {
    id: "1",
    content: "Olá! Boa tarde!",
    timestamp: "14:30",
    sender: "contact",
  },
  {
    id: "2",
    content: "Gostaria de saber sobre o pedido #12345",
    timestamp: "14:31",
    sender: "contact",
  },
  {
    id: "3",
    content: "Olá Maria! Boa tarde! Vou verificar o status do seu pedido.",
    timestamp: "14:32",
    sender: "agent",
  },
  {
    id: "4",
    content: "O pedido #12345 está em separação e será enviado até amanhã.",
    timestamp: "14:33",
    sender: "agent",
  },
  {
    id: "5",
    content: "Perfeito! Muito obrigada pela informação!",
    timestamp: "14:34",
    sender: "contact",
  },
];

interface ChatViewProps {
  conversation: Conversation;
}

export function ChatView({ conversation }: ChatViewProps) {
  const [message, setMessage] = useState("");

  const initials = conversation.contactName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSend = () => {
    if (message.trim()) {
      console.log("Enviando:", message);
      setMessage("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{conversation.contactName}</h3>
              <ChannelBadge channel={conversation.channel} />
            </div>
            {conversation.contactPhone && (
              <p className="text-sm text-muted-foreground">{conversation.contactPhone}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <User className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {mockMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.sender === "agent" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[70%] px-4 py-2.5 rounded-2xl",
                msg.sender === "agent"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-secondary-foreground rounded-bl-md"
              )}
            >
              <p className="text-sm">{msg.content}</p>
              <p
                className={cn(
                  "text-xs mt-1",
                  msg.sender === "agent" ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Smile className="w-5 h-5" />
          </Button>
          <Input
            placeholder="Digite sua mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 bg-secondary border-border"
          />
          <Button onClick={handleSend} className="shadow-glow">
            <Send className="w-4 h-4 mr-2" />
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
