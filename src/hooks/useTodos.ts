import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useTodos() {
  const queryClient = useQueryClient();

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos" as any)
        .select("*")
        .order("is_completed", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Todo[];
    },
  });

  const addTodo = useMutation({
    mutationFn: async (todo: { title: string; description?: string; priority?: string; due_date?: string }) => {
      const { error } = await supabase.from("todos" as any).insert(todo as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const toggleTodo = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase.from("todos" as any).update({ is_completed } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const deleteTodo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const updateTodo = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Todo> & { id: string }) => {
      const { error } = await supabase.from("todos" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  return { todos, isLoading, addTodo, toggleTodo, deleteTodo, updateTodo };
}
