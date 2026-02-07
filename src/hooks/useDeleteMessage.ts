import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteMessageParams {
  messageId: string;
  conversationId: string;
  deleteForEveryone?: boolean;
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId, deleteForEveryone = true }: DeleteMessageParams) => {
      const { data, error } = await supabase.functions.invoke("delete-message", {
        body: { messageId, conversationId, deleteForEveryone },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to delete message");
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Mensagem deletada");
    },
    onError: (error: Error) => {
      toast.error("Erro ao deletar mensagem: " + error.message);
    },
  });
}
