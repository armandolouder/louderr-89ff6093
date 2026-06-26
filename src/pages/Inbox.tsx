import { useState, useEffect } from "react";
import { useCustomTabs } from "@/hooks/useCustomTabs";
import { MessageSquareOff, ArrowLeft, ImageDown, Loader2 } from "lucide-react";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatView } from "@/components/inbox/ChatView";
import { CustomTabsSidebar } from "@/components/inbox/CustomTabsSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Conversation, useConversations } from "@/hooks/useConversations";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNewMessageAlerts } from "@/hooks/useNewMessageAlerts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const SELECTED_CONV_KEY = "inbox:selectedConversationId";

export default function Inbox() {
  const [selectedId, setSelectedId] = useState<string | null>(
    () => sessionStorage.getItem(SELECTED_CONV_KEY)
  );
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const isMobile = useIsMobile();
  const { data: tabs } = useCustomTabs();
  const { data: conversations } = useConversations();
  const queryClient = useQueryClient();
  const [isFetchingPhoto, setIsFetchingPhoto] = useState(false);

  const fetchWhatsappPhoto = async (contactId: string) => {
    setIsFetchingPhoto(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-whatsapp-photo", {
        body: { contactId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha ao buscar foto");
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Foto do WhatsApp atualizada");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao buscar foto do WhatsApp");
    } finally {
      setIsFetchingPhoto(false);
    }
  };

  // Resolve the full conversation object from the persisted id so the open
  // chat survives navigating to other pages and back.
  const selectedConversation =
    (conversations || []).find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId) sessionStorage.setItem(SELECTED_CONV_KEY, selectedId);
    else sessionStorage.removeItem(SELECTED_CONV_KEY);
  }, [selectedId]);
  
  // Ativa notificações de novas mensagens (som + toast + animação)
  useNewMessageAlerts();

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id);
  };

  const handleBack = () => {
    setSelectedId(null);
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)] bg-background">
        {/* Mobile Header */}
        {selectedConversation ? (
          <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
            <div className="flex items-center gap-3 h-14 px-4">
              <Button variant="ghost" size="icon" onClick={handleBack} className="text-muted-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-foreground truncate">
                  {selectedConversation.contact.name}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedConversation.contact.phone || selectedConversation.channel}
                </p>
              </div>
              {selectedConversation.channel === "whatsapp" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchWhatsappPhoto(selectedConversation.contact_id)}
                  disabled={isFetchingPhoto}
                  aria-label="Puxar foto do WhatsApp"
                  className="text-muted-foreground flex-shrink-0"
                >
                  {isFetchingPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ImageDown className="w-5 h-5" />
                  )}
                </Button>
              )}
            </div>
          </header>
        ) : (
          <MobileHeader title="Atendimentos" />
        )}

        {/* Content with slide animation */}
        <div className="flex-1 relative overflow-hidden">
          {/* Conversation List */}
          <div
            className={cn(
              "absolute inset-0 transition-transform duration-300 ease-out",
              selectedConversation ? "-translate-x-full" : "translate-x-0"
            )}
          >
            <ConversationList
              selectedId={selectedConversation?.id}
              onSelect={handleSelectConversation}
              filterTabId={selectedTabId}
              showArchived={showArchived}
              onToggleArchived={() => setShowArchived(!showArchived)}
            />
          </div>

          {/* Chat View */}
          <div
            className={cn(
              "absolute inset-0 transition-transform duration-300 ease-out",
              selectedConversation ? "translate-x-0" : "translate-x-full"
            )}
          >
            {selectedConversation && (
              <ChatView conversation={selectedConversation} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-80 xl:w-96 flex-shrink-0 overflow-hidden">
        <ConversationList
          selectedId={selectedConversation?.id}
          onSelect={handleSelectConversation}
          filterTabId={selectedTabId}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived(!showArchived)}
        />
      </div>
      
      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedTabId && (() => {
          const activeTab = (tabs || []).find(t => t.id === selectedTabId);
          if (activeTab?.manychat_url) {
            return (
              <div className="h-full w-full bg-background">
                <iframe 
                  src={activeTab.manychat_url} 
                  className="w-full h-full border-none"
                  allow="camera; microphone; clipboard-read; clipboard-write"
                />
              </div>
            );
          }
          return null;
        })()}
        
        {(!selectedTabId || !((tabs || []).find(t => t.id === selectedTabId))?.manychat_url) && (
          selectedConversation ? (
            <ChatView conversation={selectedConversation} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
                <MessageSquareOff className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-muted-foreground max-w-sm">
                Escolha uma conversa na lista ao lado para visualizar e responder as mensagens
              </p>
            </div>
          )
        )}
      </div>

      <CustomTabsSidebar
        selectedTabId={selectedTabId}
        onSelectTab={setSelectedTabId}
      />
    </div>
  );
}

