import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: "contact" | "agent";
  sender_id: string | null;
  message_type: "text" | "image" | "audio" | "video" | "document";
  media_url: string | null;
  metadata: Record<string, unknown>;
  status: "sent" | "delivered" | "read";
  created_at: string;
}

export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      content,
      channel = "whatsapp"
    }: { 
      conversationId: string; 
      content: string;
      channel?: "whatsapp" | "instagram";
    }) => {
      // For WhatsApp, use the edge function to send via UAZAPI
      if (channel === "whatsapp") {
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: { conversationId, content, messageType: "text" },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || "Failed to send message");
        
        return data.message;
      }

      // For Instagram (or fallback), save directly to database
      const { data: message, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          content,
          sender_type: "agent",
          message_type: "text",
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Update conversation last_message
      const { error: convError } = await supabase
        .from("conversations")
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (convError) throw convError;

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
