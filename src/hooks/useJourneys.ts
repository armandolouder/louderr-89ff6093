import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JourneyRow {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  nodes: any;
  edges: any;
  kill_conditions: any;
  status: string;
  is_active: boolean;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useJourneys() {
  return useQuery({
    queryKey: ["customer-journeys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_journeys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as JourneyRow[];
    },
  });
}

export function useSaveJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (journey: Partial<JourneyRow> & { id?: string }) => {
      const payload = {
        name: journey.name,
        description: journey.description,
        trigger_event: journey.trigger_event,
        nodes: journey.nodes,
        edges: journey.edges,
        kill_conditions: journey.kill_conditions,
        status: journey.status,
        is_active: journey.is_active,
      };

      let result;
      if (journey.id) {
        const { data, error } = await supabase
          .from("customer_journeys")
          .update(payload)
          .eq("id", journey.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from("customer_journeys")
          .insert({ ...payload, name: payload.name!, trigger_event: payload.trigger_event! })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      // MIGRATION: When activating a journey, auto-disable automations with the same trigger
      if (journey.is_active && journey.trigger_event) {
        // Map journey triggers to automation trigger_events
        const triggerMap: Record<string, string[]> = {
          visit: [],
          cart: ["abandoned_checkout"],
          purchase: ["order/created", "order/paid"],
          payment_pending: ["order/created"],
          payment_confirmed: ["order/paid"],
          packed: ["order/packed"],
          shipped: ["order/fulfilled"],
          delivered: [],
        };
        const automationTriggers = triggerMap[journey.trigger_event] || [];
        if (automationTriggers.length > 0) {
          await supabase
            .from("automation_flows")
            .update({ status: "inactive", is_active: false })
            .in("trigger_event", automationTriggers);
        }
      }

      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-journeys"] });
      qc.invalidateQueries({ queryKey: ["automation-flows"] });
    },
  });
}

export function useDeleteJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_journeys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-journeys"] }),
  });
}

export function useJourneyExecutions(journeyId?: string) {
  return useQuery({
    queryKey: ["journey-executions", journeyId],
    enabled: !!journeyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_executions")
        .select("*")
        .eq("journey_id", journeyId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}
