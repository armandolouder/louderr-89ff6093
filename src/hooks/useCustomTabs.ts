import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface CustomTab {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export function useCustomTabs() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["custom-tabs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_tabs")
        .select("*")
        .order("order", { ascending: true });

      if (error) throw error;
      return data as CustomTab[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("custom-tabs-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "custom_tabs" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["custom-tabs"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useCreateTab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tab: { name: string; color: string; icon: string }) => {
      // Get the max order to add at the end
      const { data: existing } = await supabase
        .from("custom_tabs")
        .select("order")
        .order("order", { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? existing[0].order + 1 : 0;

      const { data, error } = await supabase
        .from("custom_tabs")
        .insert({ ...tab, order: nextOrder })
        .select()
        .single();

      if (error) throw error;
      return data as CustomTab;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-tabs"] });
    },
  });
}

export function useUpdateTab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string; icon?: string }) => {
      const { data, error } = await supabase
        .from("custom_tabs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomTab;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-tabs"] });
    },
  });
}

export function useDeleteTab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_tabs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-tabs"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMoveToTab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, tabId }: { conversationId: string; tabId: string | null }) => {
      const { error } = await supabase
        .from("conversations")
        .update({ tab_id: tabId })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useTabConversationCounts() {
  return useQuery({
    queryKey: ["tab-conversation-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("tab_id, unread_count, is_archived");

      if (error) throw error;

      const counts: Record<string, number> = {};
      let waiting = 0;
      data.forEach((conv) => {
        const tabId = conv.tab_id || "all";
        counts[tabId] = (counts[tabId] || 0) + 1;
        if (!conv.is_archived && (conv.unread_count || 0) > 0) waiting++;
      });
      counts["__waiting__"] = waiting;

      return counts;
    },
  });
}
