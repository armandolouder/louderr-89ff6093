import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile, MoreVertical, Phone, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChannelBadge } from "./ChannelBadge";
import { Conversation } from "@/hooks/useConversations";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ChatViewProps {
  conversation: Conversation;
}

export function ChatView({ conversation }: ChatViewProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages, isLoading } = useMessages(conversation.id);
  const sendMessage = useSendMessage();

  const initials = conversation.contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSend = () => {
    if (message.trim() && !sendMessage.isPending) {
      sendMessage.mutate({
        conversationId: conversation.id,
        content: message.trim(),
        channel: conversation.channel,
      });
      setMessage("");
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
              <h3 className="font-semibold text-foreground">{conversation.contact.name}</h3>
              <ChannelBadge channel={conversation.channel} />
            </div>
            {conversation.contact.phone && (
              <p className="text-sm text-muted-foreground">{conversation.contact.phone}</p>
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
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Nenhuma mensagem ainda
          </div>
        ) : (
          messages?.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.sender_type === "agent" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] px-4 py-2.5 rounded-2xl",
                  msg.sender_type === "agent"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                )}
              >
                <p className="text-sm">{msg.content}</p>
                <p
                  className={cn(
                    "text-xs mt-1",
                    msg.sender_type === "agent" ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {format(new Date(msg.created_at), "HH:mm")}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
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
          <Button onClick={handleSend} disabled={sendMessage.isPending} className="shadow-glow">
            {sendMessage.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
