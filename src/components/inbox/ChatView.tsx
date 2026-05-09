import { useState, useRef, useEffect, ClipboardEvent, ChangeEvent } from "react";
import { Send, Paperclip, Smile, MoreVertical, Phone, User, Loader2, Sparkles, MessageSquareText, X, Image as ImageIcon, ArrowDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChannelBadge } from "./ChannelBadge";
import { MediaPreview } from "./MediaPreview";
import { ReactionPicker } from "./ReactionPicker";
import { MessageActions } from "./MessageActions";
import { QuickResponsePicker } from "./QuickResponsePicker";
import { QuickResponseManager } from "./QuickResponseManager";
import { InstagramHandoverDialog } from "./InstagramHandoverDialog";
import { Conversation } from "@/hooks/useConversations";
import { useMessages, useSendMessage, useSendMediaMessage } from "@/hooks/useMessages";
import { QuickResponse } from "@/hooks/useQuickResponses";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatViewProps {
  conversation: Conversation;
  hideHeader?: boolean;
}

export function ChatView({ conversation, hideHeader }: ChatViewProps) {
  const [message, setMessage] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [showQuickResponseManager, setShowQuickResponseManager] = useState(false);
  const [pastedImage, setPastedImage] = useState<{ file: File; preview: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [handoverError, setHandoverError] = useState<string | null>(null);
  const [isSyncingIg, setIsSyncingIg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const isInstagramChannel = conversation.channel === "instagram" || conversation.channel === "instagram-personal";

  const syncInstagramPersonal = async () => {
    setIsSyncingIg(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-personal-fetch", {});
      if (error) throw error;
      if (!data?.success) {
        const firstError = Array.isArray(data?.results)
          ? data.results.find((item: any) => item?.message || item?.error)
          : null;
        throw new Error(firstError?.message || data?.error || "Falha ao sincronizar");
      }
      const total = (data.results || []).reduce((s: number, r: any) => s + (r.new || 0), 0);
      toast.success(total > 0 ? `${total} nova(s) mensagem(ns)` : "Sincronizado, sem novidades");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao sincronizar Instagram");
    } finally {
      setIsSyncingIg(false);
    }
  };

  const EMOJI_LIST = ["😀", "😂", "🥰", "😍", "🤩", "😎", "🤔", "😅", "👍", "👏", "🔥", "❤️", "💯", "🎉", "✅", "⭐"];

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPastedImage({ file, preview });
    toast.success("Arquivo selecionado! Clique em enviar.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };
  
  const { data: messages, isLoading } = useMessages(conversation.id);
  const sendMessage = useSendMessage();
  const sendMediaMessage = useSendMediaMessage();

  const handleQuickResponseSelect = (response: QuickResponse) => {
    setMessage(response.content);
  };

  // Handle paste events to capture images from clipboard
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const preview = URL.createObjectURL(file);
          setPastedImage({ file, preview });
          toast.success("Imagem colada! Clique em enviar para compartilhar.");
        }
        return;
      }
    }
  };

  // Cleanup preview URL on unmount or when image changes
  useEffect(() => {
    return () => {
      if (pastedImage?.preview) {
        URL.revokeObjectURL(pastedImage.preview);
      }
    };
  }, [pastedImage]);

  const clearPastedImage = () => {
    if (pastedImage?.preview) {
      URL.revokeObjectURL(pastedImage.preview);
    }
    setPastedImage(null);
  };

  const improveWithAI = async () => {
    if (!message.trim()) {
      toast.error("Digite uma mensagem para melhorar");
      return;
    }

    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-message", {
        body: {
          message,
          mode: "improve",
          customerName: conversation.contact.name,
          variants: 3,
        },
      });

      if (error || !data?.success) {
        toast.error("Erro ao melhorar mensagem");
        console.error(error || data);
        return;
      }

      const improvedText = data.message || (Array.isArray(data.variants) ? data.variants[0] : null);
      if (!improvedText) {
        toast.error("Nenhuma correção gerada");
        return;
      }

      setMessage(improvedText);
      toast.success("Texto corrigido!");
    } catch (error) {
      console.error("Improve error:", error);
      toast.error("Erro ao melhorar mensagem");
    } finally {
      setIsImproving(false);
    }
  };

  const initials = conversation.contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSend = () => {
    // If there's a pasted image, send it as media
    if (pastedImage) {
      sendMediaMessage.mutate({
        conversationId: conversation.id,
        file: pastedImage.file,
        caption: message.trim() || undefined,
        channel: conversation.channel,
      }, {
        onSuccess: () => {
          clearPastedImage();
          setMessage("");
        },
        onError: (error: any) => {
          console.error("Error sending media:", error);
          if (error?.requires_handover_setup) {
            setHandoverError(error.message);
          } else {
            toast.error(error?.message || "Erro ao enviar imagem");
          }
        }
      });
      return;
    }

    // Regular text message
    if (message.trim() && !sendMessage.isPending) {
      sendMessage.mutate({
        conversationId: conversation.id,
        content: message.trim(),
        channel: conversation.channel,
      }, {
        onSuccess: () => setMessage(""),
        onError: (error: any) => {
          console.error("Error sending message:", error);
          if (error?.requires_handover_setup) {
            setHandoverError(error.message);
          } else {
            toast.error(error?.message || "Erro ao enviar mensagem");
          }
        },
      });
    }
  };

  const isSending = sendMessage.isPending || sendMediaMessage.isPending;

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 50);
  };

  // Auto-scroll to bottom when messages load or change
  useEffect(() => {
    if (!messages?.length) return;
    // Use longer delay on conversation switch to wait for render
    const delay = 100;
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
    }, delay);
    return () => clearTimeout(timer);
  }, [messages, conversation.id]);

  // Detect scroll position to show/hide scroll-down button
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollDown(distanceFromBottom > 150);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <InstagramHandoverDialog
        open={!!handoverError}
        onOpenChange={(o) => !o && setHandoverError(null)}
        errorMessage={handoverError ?? undefined}
      />
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
            {isInstagramChannel && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={syncInstagramPersonal}
                    disabled={isSyncingIg}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className={cn("w-5 h-5", isSyncingIg && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sincronizar Instagram Pessoal</TooltipContent>
              </Tooltip>
            )}
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
      <div className="relative flex-1 overflow-hidden">
        <div ref={messagesContainerRef} onScroll={handleScroll} className={cn("h-full overflow-y-auto overflow-x-hidden space-y-4", isMobile ? "p-3" : "p-6")}>
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
                    "flex flex-col group",
                    msg.sender_type === "agent" ? "items-end" : "items-start"
                  )}
                >
                  {/* Timestamp outside bubble */}
                  <div className={cn(
                    "flex items-center gap-1.5 mb-1 px-1",
                    msg.sender_type === "agent" ? "flex-row-reverse" : "flex-row"
                  )}>
                    <span className="text-[10px] text-muted-foreground/60">
                      {format(new Date(msg.created_at), "HH:mm")}
                    </span>
                    {msg.sender_type === "agent" && msg.status && (
                      <span className="text-[10px] text-muted-foreground/60">
                        {msg.status === "sent" && "✓"}
                        {msg.status === "delivered" && "✓✓"}
                        {msg.status === "read" && "✓✓"}
                      </span>
                    )}
                  </div>

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
                        />
                      </>
                    )}
                    
                    <div className="max-w-[70%] relative">
                      {/* Bubble tail SVG */}
                      <svg
                        width="8"
                        height="13"
                        viewBox="0 0 8 13"
                        className={cn(
                          "absolute bottom-0 z-0",
                          msg.sender_type === "agent" ? "-right-[7px] text-primary" : "-left-[7px] text-secondary -scale-x-100"
                        )}
                      >
                        <path d="M0 0 L0 11 Q0 13 2 13 L8 13 Q2 11 0 0Z" fill="currentColor" />
                      </svg>
                       <div
                         className={cn(
                           "px-4 py-2.5 rounded-2xl relative z-[1] fintech-card",
                           msg.sender_type === "agent"
                             ? "bg-primary/90 text-primary-foreground rounded-br-none"
                             : "bg-secondary/80 backdrop-blur text-secondary-foreground rounded-bl-none border-0"
                         )}
                       >
                      <MediaPreview 
                        type={messageType}
                        url={msg.media_url}
                        content={msg.content}
                        isAgent={msg.sender_type === "agent"}
                      />
                      
                      {/* Display reactions on message */}
                      {reactions && reactions.length > 0 && (
                        <div className="absolute -bottom-3 left-2 flex gap-0.5 bg-card/80 backdrop-blur-sm rounded-full px-1 py-0.5 shadow-sm border border-border/30">
                          {reactions.map((r, idx) => (
                            <span key={idx} className="text-xs">{r.emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    </div>

                    {/* Message actions and reaction picker for sent messages */}
                    {msg.sender_type === "agent" && (
                      <>
                        <ReactionPicker 
                          messageId={msg.id} 
                          conversationId={conversation.id}
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

        {/* Scroll to bottom button */}
        {showScrollDown && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 right-4 rounded-full shadow-lg h-10 w-10 z-10 border border-border/50"
            onClick={() => scrollToBottom()}
          >
            <ArrowDown className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Input - Mobile optimized */}
      <div className={cn(
        "border-t border-border bg-card",
        isMobile ? "p-2 pb-3" : "p-4"
      )}>
        {/* Image preview */}
        {pastedImage && (
          <div className="mb-3 relative inline-block">
            <img 
              src={pastedImage.preview} 
              alt="Preview" 
              className="max-h-32 rounded-lg border border-border"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={clearPastedImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {isMobile ? (
          // Mobile layout: Input com botão enviar, ações embaixo
          <div className="space-y-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" />
            <div className="flex items-end gap-2">
              <Textarea
                placeholder={pastedImage ? "Adicione uma legenda (opcional)..." : "Digite sua mensagem..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onPaste={handlePaste}
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
                disabled={isSending || (!message.trim() && !pastedImage)} 
                size="icon"
                className="h-11 w-11 shadow-glow flex-shrink-0"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : pastedImage ? (
                  <ImageIcon className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8 px-2" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="w-4 h-4 mr-1" />
                <span className="text-xs">Anexo</span>
              </Button>
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8 px-2">
                    <Smile className="w-4 h-4 mr-1" />
                    <span className="text-xs">Emoji</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" side="top">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_LIST.map((emoji) => (
                      <button key={emoji} onClick={() => insertEmoji(emoji)} className="text-xl hover:scale-125 transition-transform p-1">{emoji}</button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button 
                variant="ghost" 
                size="sm"
                className={cn(
                  "text-muted-foreground hover:text-foreground h-8 px-2",
                  isImproving && "animate-pulse"
                )}
                onClick={improveWithAI}
                disabled={isImproving || !message.trim()}
              >
                {isImproving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                <span className="text-xs">Melhorar</span>
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
          <div className="space-y-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" />
            <div className="flex items-end gap-2">
              <Textarea
                placeholder={pastedImage ? "Adicione uma legenda (opcional)..." : "Digite sua mensagem..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 bg-secondary border-border min-h-[44px] max-h-32 resize-none"
                spellCheck={true}
                lang="pt-BR"
                autoComplete="off"
                autoCorrect="on"
                rows={1}
              />
              <Button 
                onClick={handleSend} 
                disabled={isSending || (!message.trim() && !pastedImage)} 
                size="icon"
                className="shadow-glow h-11 w-11 rounded-full flex-shrink-0"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Anexar arquivo</TooltipContent>
              </Tooltip>
              
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Smile className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" side="top">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_LIST.map((emoji) => (
                      <button key={emoji} onClick={() => insertEmoji(emoji)} className="text-xl hover:scale-125 transition-transform p-1">{emoji}</button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-8 w-8 text-muted-foreground hover:text-foreground",
                      isImproving && "animate-pulse"
                    )}
                    onClick={improveWithAI}
                    disabled={isImproving || !message.trim()}
                  >
                    {isImproving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Melhorar com IA</TooltipContent>
              </Tooltip>
              
              <QuickResponsePicker 
                onSelect={handleQuickResponseSelect}
                onManage={() => setShowQuickResponseManager(true)}
              />
            </div>
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
