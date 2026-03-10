import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSendReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      messageId, 
      emoji,
      conversationId,
    }: { 
      messageId: string; 
      emoji: string;
      conversationId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("send-reaction", {
        body: { messageId, emoji, conversationId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to send reaction");
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
    },
  });
}
