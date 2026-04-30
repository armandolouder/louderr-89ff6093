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

      // For Instagram, send via Meta Graph API
      if (channel === "instagram") {
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
        const { data, error } = await supabase.functions.invoke("send-instagram", {
          body: { conversationId, content, messageType: "text" },
        });
        if (error) throw error;
        if (!data?.success) {
          const err: any = new Error(data?.error || "Falha ao enviar no Instagram");
          err.requires_handover_setup = !!data?.requires_handover_setup || !!data?.requires_business_config;
          err.meta = data?.meta;
          throw err;
        }
        return data.message;
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
    onSuccess: (_, variables) => {
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
      channel?: "whatsapp" | "instagram";
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

      // Instagram via Meta Graph API
      if (channel === "instagram") {
        const { data, error } = await supabase.functions.invoke("send-instagram", {
          body: {
            conversationId,
            content: caption || "",
            messageType: "image",
            mediaUrl,
          },
        });
        if (error) throw error;
        if (!data?.success) {
          const err: any = new Error(data?.error || "Falha ao enviar mídia no Instagram");
          err.requires_handover_setup = !!data?.requires_handover_setup || !!data?.requires_business_config;
          err.meta = data?.meta;
          throw err;
        }
        return data.message;
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
