import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile, MoreVertical, Phone, User, Loader2, SpellCheck, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChannelBadge } from "./ChannelBadge";
import { MediaPreview } from "./MediaPreview";
import { ReactionPicker } from "./ReactionPicker";
import { MessageActions } from "./MessageActions";
import { QuickResponsePicker } from "./QuickResponsePicker";
import { QuickResponseManager } from "./QuickResponseManager";
import { Conversation } from "@/hooks/useConversations";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { QuickResponse } from "@/hooks/useQuickResponses";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatViewProps {
  conversation: Conversation;
  hideHeader?: boolean;
}

export function ChatView({ conversation, hideHeader }: ChatViewProps) {
  const [message, setMessage] = useState("");
  const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);
  const [showQuickResponseManager, setShowQuickResponseManager] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const { data: messages, isLoading } = useMessages(conversation.id);
  const sendMessage = useSendMessage();

  const handleQuickResponseSelect = (response: QuickResponse) => {
    setMessage(response.content);
    // If has media, we could handle it here for sending
  };

  const checkSpelling = async () => {
    if (!message.trim()) {
      toast.error("Digite uma mensagem para verificar");
      return;
    }
    
    setIsCheckingSpelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("groq-chat", {
        body: {
          messages: [
            {
              role: "system",
              content: "Você é um corretor ortográfico. Corrija apenas erros de ortografia e acentuação do texto em português. Retorne APENAS o texto corrigido, sem explicações ou comentários adicionais. Se o texto já estiver correto, retorne-o exatamente como está."
            },
            {
              role: "user",
              content: message
            }
          ],
          model: "llama-3.3-70b-versatile",
          max_tokens: 500,
          temperature: 0.1,
        },
      });

      if (error) {
        toast.error("Erro ao verificar ortografia");
        console.error(error);
        return;
      }

      const correctedText = data?.choices?.[0]?.message?.content?.trim();
      
      if (correctedText) {
        if (correctedText === message.trim()) {
          toast.success("Texto já está correto!");
        } else {
          setMessage(correctedText);
          toast.success("Ortografia corrigida!");
        }
      }
    } catch (error) {
      console.error("Spell check error:", error);
      toast.error("Erro ao verificar ortografia");
    } finally {
      setIsCheckingSpelling(false);
    }
  };

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
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header - Hidden on mobile since Inbox.tsx provides it */}
      {!isMobile && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar className="w-10 h-10 flex-shrink-0">
              {conversation.contact.avatar_url && (
                <AvatarImage src={conversation.contact.avatar_url} alt={conversation.contact.name} />
              )}
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">{conversation.contact.name}</h3>
                <ChannelBadge channel={conversation.channel} />
              </div>
              {conversation.contact.phone && (
                <p className="text-sm text-muted-foreground truncate">{conversation.contact.phone}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
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
      )}

      {/* Messages */}
      <div className={cn("flex-1 overflow-y-auto overflow-x-hidden space-y-4", isMobile ? "p-3" : "p-6")}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Nenhuma mensagem ainda
          </div>
        ) : (
          messages?.map((msg, index) => {
            const messageType = (msg.message_type || "text") as "text" | "image" | "audio" | "video" | "document";
            const reactions = (msg.metadata as Record<string, unknown>)?.reactions as { emoji: string; sent_at: string }[] | undefined;
            
            // Date separator logic
            const messageDate = new Date(msg.created_at);
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const prevDate = prevMessage ? new Date(prevMessage.created_at) : null;
            const showDateSeparator = !prevDate || 
              messageDate.toDateString() !== prevDate.toDateString();
            
            const formatDateSeparator = (date: Date) => {
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              if (date.toDateString() === today.toDateString()) {
                return "Hoje";
              } else if (date.toDateString() === yesterday.toDateString()) {
                return "Ontem";
              } else {
                return format(date, "dd/MM/yyyy");
              }
            };
            
            return (
              <div key={msg.id}>
                {/* Date separator */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                      {formatDateSeparator(messageDate)}
                    </div>
                  </div>
                )}
                
                <div
                  className={cn(
                    "flex group",
                    msg.sender_type === "agent" ? "justify-end" : "justify-start"
                  )}
                >
                  <div className="flex items-end gap-1">
                    {/* Message actions and reaction picker for received messages */}
                    {msg.sender_type === "contact" && (
                      <>
                        <MessageActions
                          messageId={msg.id}
                          conversationId={conversation.id}
                          isVisible={true}
                        />
                        <ReactionPicker 
                          messageId={msg.id} 
                          conversationId={conversation.id}
                          existingReactions={reactions}
                        />
                      </>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[70%] px-4 py-2.5 rounded-2xl relative",
                        msg.sender_type === "agent"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-secondary-foreground rounded-bl-md"
                      )}
                    >
                      <MediaPreview 
                        type={messageType}
                        url={msg.media_url}
                        content={msg.content}
                        isAgent={msg.sender_type === "agent"}
                      />
                      <div className={cn(
                        "flex items-center gap-2 mt-1",
                        msg.sender_type === "agent" ? "justify-end" : "justify-start"
                      )}>
                        <p
                          className={cn(
                            "text-xs",
                            msg.sender_type === "agent" ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}
                        >
                          {format(new Date(msg.created_at), "HH:mm")}
                        </p>
                        {msg.sender_type === "agent" && msg.status && (
                          <span className={cn(
                            "text-xs",
                            msg.status === "read" ? "text-primary-foreground" : "text-primary-foreground/50"
                          )}>
                            {msg.status === "sent" && "✓"}
                            {msg.status === "delivered" && "✓✓"}
                            {msg.status === "read" && "✓✓"}
                          </span>
                        )}
                      </div>
                      
                      {/* Display reactions on message */}
                      {reactions && reactions.length > 0 && (
                        <div className="absolute -bottom-3 left-2 flex gap-0.5 bg-card rounded-full px-1 py-0.5 shadow-sm border border-border">
                          {reactions.map((r, idx) => (
                            <span key={idx} className="text-xs">{r.emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Message actions and reaction picker for sent messages */}
                    {msg.sender_type === "agent" && (
                      <>
                        <ReactionPicker 
                          messageId={msg.id} 
                          conversationId={conversation.id}
                          existingReactions={reactions}
                        />
                        <MessageActions
                          messageId={msg.id}
                          conversationId={conversation.id}
                          isVisible={true}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Mobile optimized */}
      <div className={cn(
        "border-t border-border bg-card",
        isMobile ? "p-2 pb-3" : "p-4"
      )}>
        {isMobile ? (
          // Mobile layout: Input com botão enviar, ações embaixo
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 bg-secondary border-border min-h-[44px] max-h-32 text-base resize-none"
                spellCheck={true}
                lang="pt-BR"
                autoComplete="off"
                autoCorrect="on"
                rows={1}
              />
              <Button 
                onClick={handleSend} 
                disabled={sendMessage.isPending || !message.trim()} 
                size="icon"
                className="h-11 w-11 shadow-glow flex-shrink-0"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8 px-2">
                <Paperclip className="w-4 h-4 mr-1" />
                <span className="text-xs">Anexo</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8 px-2">
                <Smile className="w-4 h-4 mr-1" />
                <span className="text-xs">Emoji</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className={cn(
                  "text-muted-foreground hover:text-foreground h-8 px-2",
                  isCheckingSpelling && "animate-pulse"
                )}
                onClick={checkSpelling}
                disabled={isCheckingSpelling || !message.trim()}
              >
                {isCheckingSpelling ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <SpellCheck className="w-4 h-4 mr-1" />
                )}
                <span className="text-xs">Corrigir</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-muted-foreground hover:text-foreground h-8 px-2"
                onClick={() => setShowQuickResponseManager(true)}
              >
                <MessageSquareText className="w-4 h-4 mr-1" />
                <span className="text-xs">Rápidas</span>
              </Button>
            </div>
          </div>
        ) : (
          // Desktop layout
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Paperclip className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Anexar arquivo</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Smile className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Emoji</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    isCheckingSpelling && "animate-pulse"
                  )}
                  onClick={checkSpelling}
                  disabled={isCheckingSpelling || !message.trim()}
                >
                  {isCheckingSpelling ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <SpellCheck className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Corrigir ortografia</TooltipContent>
            </Tooltip>
            
            <QuickResponsePicker 
              onSelect={handleQuickResponseSelect}
              onManage={() => setShowQuickResponseManager(true)}
            />
            
            <Textarea
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 bg-secondary border-border min-h-[40px] max-h-32 resize-none"
              spellCheck={true}
              lang="pt-BR"
              autoComplete="off"
              autoCorrect="on"
              rows={1}
            />
            <Button 
              onClick={handleSend} 
              disabled={sendMessage.isPending} 
              className="shadow-glow"
            >
              {sendMessage.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar
            </Button>
          </div>
        )}
      </div>

      <QuickResponseManager 
        open={showQuickResponseManager} 
        onOpenChange={setShowQuickResponseManager} 
      />
    </div>
  );
}
