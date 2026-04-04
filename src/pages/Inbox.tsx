import { useState } from "react";
import { MessageSquareOff, ArrowLeft } from "lucide-react";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatView } from "@/components/inbox/ChatView";
import { CustomTabsSidebar } from "@/components/inbox/CustomTabsSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Conversation } from "@/hooks/useConversations";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNewMessageAlerts } from "@/hooks/useNewMessageAlerts";

export default function Inbox() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const isMobile = useIsMobile();
  
  // Ativa notificações de novas mensagens (som + toast + animação)
  useNewMessageAlerts();

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBack = () => {
    setSelectedConversation(null);
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
        {selectedConversation ? (
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
        )}
      </div>

      <CustomTabsSidebar
        selectedTabId={selectedTabId}
        onSelectTab={setSelectedTabId}
      />
    </div>
  );
}

