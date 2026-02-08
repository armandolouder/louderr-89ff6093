import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface QuickResponse {
  id: string;
  title: string;
  content: string;
  media_url: string | null;
  media_type: "image" | "gif" | "video" | "document" | null;
  shortcut: string | null;
  category: string | null;
  is_active: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export function useQuickResponses() {
  return useQuery({
    queryKey: ["quick-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_responses")
        .select("*")
        .eq("is_active", true)
        .order("use_count", { ascending: false });

      if (error) throw error;
      return data as QuickResponse[];
    },
  });
}

export function useCreateQuickResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (response: Omit<QuickResponse, "id" | "created_at" | "updated_at" | "use_count">) => {
      const { data, error } = await supabase
        .from("quick_responses")
        .insert(response)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-responses"] });
    },
  });
}

export function useUpdateQuickResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QuickResponse> & { id: string }) => {
      const { data, error } = await supabase
        .from("quick_responses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-responses"] });
    },
  });
}

export function useDeleteQuickResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quick_responses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-responses"] });
    },
  });
}

export function useIncrementQuickResponseUse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: current, error: fetchError } = await supabase
        .from("quick_responses")
        .select("use_count")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("quick_responses")
        .update({ use_count: (current?.use_count || 0) + 1 })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-responses"] });
    },
  });
}
