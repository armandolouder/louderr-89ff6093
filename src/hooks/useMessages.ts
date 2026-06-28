import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo } from "react";

 export interface Message {
   id: string;
   conversation_id: string;
   content: string;
   sender_type: "contact" | "agent";
   sender_id: string | null;
   message_type: "text" | "image" | "audio" | "video" | "document";
   media_url: string | null;
   metadata: Record<string, unknown>;
   evolution_message_id?: string | null;
   whatsapp_message_id?: string | null;
   status: "sent" | "delivered" | "read";
   created_at: string;
 }

const PAGE_SIZE = 30;

function deduplicate(data: Message[]): Message[] {
  return data.reduce((acc: Message[], current) => {
    const isDuplicate = acc.some((msg) => {
      const sameEvolutionId = current.evolution_message_id && msg.evolution_message_id === current.evolution_message_id;
      const sameWhatsappId = current.whatsapp_message_id && msg.whatsapp_message_id === current.whatsapp_message_id;
      if (sameEvolutionId || sameWhatsappId) return true;
      const timeDiff = Math.abs(new Date(current.created_at).getTime() - new Date(msg.created_at).getTime());
      const sameContent = msg.content === current.content;
      return sameContent && timeDiff < 5000;
    });
    if (!isDuplicate) acc.push(current);
    return acc;
  }, []);
}

export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!conversationId) return [] as Message[];

      // Busca do mais recente para o mais antigo, em páginas.
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return (data as Message[]) ?? [];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    enabled: !!conversationId,
  });

  // Achata as páginas (cada uma é descendente) numa lista ascendente e deduplicada.
  const messages = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const flat = pages.flat();
    flat.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return deduplicate(flat);
  }, [query.data]);

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
          // invalidateQueries já dispara o refetch da query ativa.
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return {
    data: messages,
    isLoading: query.isLoading,
    fetchOlder: query.fetchNextPage,
    hasMore: query.hasNextPage,
    isFetchingOlder: query.isFetchingNextPage,
  };
}

async function shouldRouteInstagramThroughZernio(conversationId: string) {
  const { data: conv } = await supabase
    .from("conversations")
    .select("external_conversation_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conv?.external_conversation_id) return true;

  const { data: account } = await supabase
    .from("zernio_accounts")
    .select("id")
    .eq("connected", true)
    .limit(1)
    .maybeSingle();

  return !!account;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      content,
      channel: initialChannel = "whatsapp"
    }: { 
      conversationId: string; 
      content: string;
      channel?: "whatsapp" | "instagram" | "instagram-personal";
    }) => {
      let channel = initialChannel;
      // For WhatsApp, use the edge function to send via UAZAPI
      if (channel === "whatsapp") {
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: { conversationId, content, messageType: "text" },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || "Failed to send message");
        
        return data.message;
      }

      // Instagram DM: Zernio é o fluxo atual; não usamos mais o envio direto Meta/handover.
      if (channel === "instagram") {
        // Instagram DM agora usa Zernio quando houver conta conectada, inclusive em conversas antigas.
        if (await shouldRouteInstagramThroughZernio(conversationId)) {
          const { data, error } = await supabase.functions.invoke("zernio-send", {
            body: { conversationId, content, messageType: "text" },
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || "Falha ao enviar no Instagram (Zernio)");
          return data;
        }
        // Priorizar Instagram Pessoal (cookies) quando ativo
        const { data: personalCred } = await supabase
          .from("instagram_personal_credentials")
          .select("status")
          .eq("status", "active")
          .maybeSingle();

        if (personalCred) {
          // Reusa o branch instagram-personal logo abaixo
          channel = "instagram-personal";
        } else {
          throw new Error("Instagram DM precisa estar conectado via Zernio. A API Meta antiga foi desativada neste painel.");
        }
      }

      // Instagram pessoal (via cookie/sessionid)
      if (channel === "instagram-personal") {
        // Pega ig_thread_id da última msg ou contact.instagram_id
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("metadata")
          .eq("conversation_id", conversationId)
          .not("metadata->ig_thread_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const meta = (lastMsg?.metadata ?? {}) as any;
        let ig_thread_id: string | undefined = meta.ig_thread_id;
        let ig_user_id: string | undefined;

        if (!ig_thread_id) {
          const { data: conv } = await supabase
            .from("conversations")
            .select("contact_id")
            .eq("id", conversationId)
            .single();
          if (conv?.contact_id) {
            const { data: contact } = await supabase
              .from("contacts")
              .select("instagram_id")
              .eq("id", conv.contact_id)
              .single();
            ig_user_id = contact?.instagram_id ?? undefined;
          }
        }

        const { data, error } = await supabase.functions.invoke("instagram-personal-send", {
          body: { thread_id: ig_thread_id, ig_user_id, text: content },
        });
        if (error) throw error;
        if (!data?.success) {
          const err: any = new Error(data?.error || "Falha ao enviar Instagram pessoal");
          err.expired = !!data?.expired;
          err.checkpoint = !!data?.checkpoint;
          throw err;
        }

        // Persiste a msg local
        const { data: msg } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            content,
            sender_type: "agent",
            message_type: "text",
            status: "sent",
            metadata: {
              ig_thread_id: data.thread_id,
              ig_item_id: data.message_id,
              source: "instagram-personal",
            },
          })
          .select()
          .single();

        await supabase
          .from("conversations")
          .update({ last_message: content, last_message_at: new Date().toISOString() })
          .eq("id", conversationId);

        return msg;
      }

      // Fallback: save directly to database
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
    // Optimistic update: mostra a mensagem no chat imediatamente, sem esperar a API.
    onMutate: async (variables) => {
      const key = ["messages", variables.conversationId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);

      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        conversation_id: variables.conversationId,
        content: variables.content,
        sender_type: "agent",
        sender_id: null,
        message_type: "text",
        media_url: null,
        metadata: { optimistic: true },
        status: "sent",
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(key, (old: any) => {
        if (!old?.pages?.length) {
          return { pages: [[optimisticMessage]], pageParams: [0] };
        }
        const pages = old.pages.map((p: Message[]) => [...p]);
        pages[0] = [optimisticMessage, ...pages[0]];
        return { ...old, pages };
      });

      return { previous, key };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSendMediaMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      file,
      caption = "",
      channel = "whatsapp"
    }: { 
      conversationId: string; 
      file: File;
      caption?: string;
      channel?: "whatsapp" | "instagram" | "instagram-personal";
    }) => {
      // Get current user for storage path ownership
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Upload file to storage with user_id prefix
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("whatsapp-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store as storage path reference (bucket is private, signed URLs used for display)
      const mediaUrl = `whatsapp-media:${filePath}`;

      // For WhatsApp, use the edge function to send via UAZAPI
      if (channel === "whatsapp") {
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: { 
            conversationId, 
            content: caption || "📷 Imagem", 
            messageType: "image",
            mediaUrl 
          },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || "Failed to send media");
        
        return data.message;
      }

      // Instagram DM: Zernio é o fluxo atual; não usamos mais o envio direto Meta/handover.
      if (channel === "instagram") {
        // Instagram DM agora usa Zernio quando houver conta conectada, inclusive em conversas antigas.
        if (await shouldRouteInstagramThroughZernio(conversationId)) {
          const { data, error } = await supabase.functions.invoke("zernio-send", {
            body: { conversationId, content: caption || "", messageType: "image", mediaUrl },
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || "Falha ao enviar mídia no Instagram (Zernio)");
          return data;
        }

        throw new Error("Instagram DM precisa estar conectado via Zernio. A API Meta antiga foi desativada neste painel.");
      }

      // Fallback: save directly to database
      const { data: message, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          content: caption || "📷 Imagem",
          sender_type: "agent",
          message_type: "image",
          media_url: mediaUrl,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      const { error: convError } = await supabase
        .from("conversations")
        .update({
          last_message: "📷 Imagem",
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
