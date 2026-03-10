import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// Global store for new message conversation IDs
let newMessageConversations = new Set<string>();
let listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function addNewMessageConversation(conversationId: string) {
  newMessageConversations.add(conversationId);
  notifyListeners();
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    newMessageConversations.delete(conversationId);
    notifyListeners();
  }, 10000);
}

export function isConversationNew(conversationId: string): boolean {
  return newMessageConversations.has(conversationId);
}

export function useIsConversationNew(conversationId: string): boolean {
  const [isNew, setIsNew] = useState(() => isConversationNew(conversationId));
  
  useEffect(() => {
    const update = () => setIsNew(isConversationNew(conversationId));
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, [conversationId]);
  
  return isNew;
}

export function useNewMessageAlerts() {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef(false);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    
    // Enable audio after first user interaction
    const handleInteraction = () => {
      hasInteractedRef.current = true;
      // Try to "prime" the audio context
      if (audioRef.current) {
        audioRef.current.load();
      }
    };
    
    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("keydown", handleInteraction, { once: true });
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current && hasInteractedRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore - browser might still block autoplay
      });
    }
  }, []);

  const showToast = useCallback((contactName: string, message: string) => {
    const truncatedMessage = message.length > 60 ? message.substring(0, 60) + "..." : message;
    toast(`🔔 Nova mensagem de ${contactName}`, {
      description: truncatedMessage,
      duration: 5000,
    });
  }, []);

  // Subscribe to new incoming messages (from contacts only)
  useEffect(() => {
    const channel = supabase
      .channel("inbox-new-message-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "sender_type=eq.contact"
        },
        async (payload) => {
          const newMessage = payload.new as {
            id: string;
            conversation_id: string;
            content: string;
          };

          // Get conversation with contact name
          const { data: conversation } = await supabase
            .from("conversations")
            .select("id, contact:contacts(name)")
            .eq("id", newMessage.conversation_id)
            .single();

          if (conversation?.contact) {
            // Play sound
            playSound();
            
            // Show toast notification
            showToast(conversation.contact.name, newMessage.content);
            
            // Mark conversation as having new message (for pulsing effect)
            addNewMessageConversation(newMessage.conversation_id);
            
            // Refresh conversations list
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, playSound, showToast]);
}
