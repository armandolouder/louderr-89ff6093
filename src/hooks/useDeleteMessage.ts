import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Message } from "./useMessages";

interface DeleteMessageParams {
  messageId: string;
  conversationId: string;
  deleteForEveryone?: boolean;
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId, deleteForEveryone = true }: DeleteMessageParams) => {
      console.log("Deleting message:", messageId, "from conversation:", conversationId);
      
      const { data, error } = await supabase.functions.invoke("delete-message", {
        body: { messageId, conversationId, deleteForEveryone },
      });

      console.log("Delete response:", data, "error:", error);

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to delete message");
      
      return data;
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["messages", variables.conversationId] });
      
      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<Message[]>(["messages", variables.conversationId]);
      
      // Optimistically remove the message
      if (previousMessages) {
        queryClient.setQueryData<Message[]>(
          ["messages", variables.conversationId],
          previousMessages.filter((msg) => msg.id !== variables.messageId)
        );
      }
      
      return { previousMessages };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Mensagem deletada");
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", variables.conversationId],
          context.previousMessages
        );
      }
      toast.error("Erro ao deletar mensagem: " + error.message);
    },
  });
}
