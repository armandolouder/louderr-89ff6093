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
  channel: "whatsapp" | "instagram";
  status: "novo" | "em_atendimento" | "aguardando" | "finalizado";
  assignee_id: string | null;
  assignee_name: string | null;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  contact: Contact;
}

export function useConversations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          contact:contacts(*)
        `)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Conversation[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
