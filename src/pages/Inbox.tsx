import { useState } from "react";
import { MessageSquareOff } from "lucide-react";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatView } from "@/components/inbox/ChatView";
import { Conversation } from "@/hooks/useConversations";

export default function Inbox() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  return (
    <div className="flex h-full">
      <div className="w-96 flex-shrink-0">
        <ConversationList
          selectedId={selectedConversation?.id}
          onSelect={setSelectedConversation}
        />
      </div>
      
      <div className="flex-1">
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
    </div>
  );
}
