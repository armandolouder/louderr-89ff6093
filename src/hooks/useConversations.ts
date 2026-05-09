import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  instagram_id: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  contact_id: string;
  channel: "whatsapp" | "instagram" | "instagram-personal";
  status: "novo" | "em_atendimento" | "aguardando" | "finalizado";
  assignee_id: string | null;
  assignee_name: string | null;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
  last_message_sender_type: "contact" | "agent" | null;
  created_at: string;
  updated_at: string;
  tab_id: string | null;
  is_archived: boolean;
  contact: Contact;
}

export function useConversations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      // Buscar conversas com contato e última mensagem
      const { data: conversations, error } = await supabase
        .from("conversations")
        .select(`
          *,
          contact:contacts(*),
          messages(sender_type, created_at)
        `)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      if (!conversations) return [];

      // Processar para extrair o sender_type da última mensagem
      const conversationsWithLastSender = conversations.map((conv) => {
        const messages = conv.messages || [];
        // Ordenar mensagens por data e pegar a mais recente
        const sortedMessages = [...messages].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastMessage = sortedMessages[0];

        // Remover o array de messages do objeto final
        const { messages: _, ...convWithoutMessages } = conv;

        return {
          ...convWithoutMessages,
          last_message_sender_type: lastMessage?.sender_type as "contact" | "agent" | null,
        };
      });

      return conversationsWithLastSender as Conversation[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          console.log("Realtime conversation update:", payload);
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.refetchQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
