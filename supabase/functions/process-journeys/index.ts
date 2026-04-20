import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { checkKillConditions } from "./killConditions.ts";
import {
  advanceToNextNode,
  completeExecution,
  markExecutionError,
} from "./executionUpdater.ts";
import { getExecutorFor } from "./nodes/registry.ts";
import type { ExecutionMetrics } from "./nodes/types.ts";

// ──────────────────────────────────────────────────────────────────────────────
// Bootstrap helpers
// ──────────────────────────────────────────────────────────────────────────────
function createSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

async function fetchActiveJourneys(supabase: any) {
  const { data, error } = await supabase
    .from("customer_journeys")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active");
  if (error) throw error;
  return data || [];
}

async function fetchDueExecutions(supabase: any) {
  const { data, error } = await supabase
    .from("journey_executions")
    .select("*")
    .eq("status", "active")
    .lte("next_action_at", new Date().toISOString());
  if (error) throw error;
  return data || [];
}

async function refreshJourneyExecutionCounts(supabase: any, journeys: any[]) {
  for (const journey of journeys) {
    const { count } = await supabase
      .from("journey_executions")
      .select("id", { count: "exact", head: true })
      .eq("journey_id", journey.id);
    await supabase
      .from("customer_journeys")
      .update({ execution_count: count || 0, last_executed_at: new Date().toISOString() })
      .eq("id", journey.id);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Per-execution processing
// ──────────────────────────────────────────────────────────────────────────────
async function processExecution(
  supabase: any,
  exec: any,
  journeys: any[],
  metrics: ExecutionMetrics
): Promise<void> {
  const journey = journeys.find((j: any) => j.id === exec.journey_id);
  if (!journey) {
    await markExecutionError(supabase, exec.id, "Journey not found");
    return;
  }

  const nodes = journey.nodes as any[];
  const edges = journey.edges as any[];

  // First-pass: bootstrap from trigger to first real node
  if (!exec.current_node_id) {
    await bootstrapFromTrigger(supabase, exec, nodes, edges);
    return;
  }

  const currentNode = nodes.find((n: any) => n.id === exec.current_node_id);
  if (!currentNode) {
    await markExecutionError(supabase, exec.id, `Node ${exec.current_node_id} not found`);
    return;
  }

  // Kill-conditions short-circuit
  const killed = await checkKillConditions(
    supabase,
    exec,
    journey.kill_conditions as string[]
  );
  if (killed.kill) {
    await completeExecution(supabase, exec.id, killed.reason);
    return;
  }

  // Dispatch to the appropriate node executor
  const executor = getExecutorFor(currentNode.type);
  if (!executor) {
    // Unknown node type → just advance through
    await advanceToNextNode(supabase, exec.id, edges, currentNode.id);
    return;
  }

  const result = await executor.execute({
    supabase,
    exec,
    journey,
    currentNode,
    edges,
    metrics,
  });

  if (!result.handled) {
    await advanceToNextNode(supabase, exec.id, edges, currentNode.id, result.extraData);
  }
}

async function bootstrapFromTrigger(
  supabase: any,
  exec: any,
  nodes: any[],
  edges: any[]
): Promise<void> {
  const triggerNode = nodes.find((n: any) => n.type === "trigger");
  if (!triggerNode) {
    await markExecutionError(supabase, exec.id, "No trigger node");
    return;
  }
  const firstEdge = edges.find((e: any) => e.source === triggerNode.id);
  if (!firstEdge) {
    await completeExecution(supabase, exec.id);
    return;
  }
  await supabase
    .from("journey_executions")
    .update({
      current_node_id: firstEdge.target,
      next_action_at: new Date().toISOString(),
    })
    .eq("id", exec.id);
}

// ──────────────────────────────────────────────────────────────────────────────
// HTTP entrypoint
// ──────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  try {
    const supabase = createSupabaseClient();
    const journeys = await fetchActiveJourneys(supabase);

    if (journeys.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No active journeys" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const executions = await fetchDueExecutions(supabase);
    const metrics: ExecutionMetrics = { emailsSent: 0, emailsSkipped: 0 };
    let processed = 0;
    let errors = 0;

    for (const exec of executions) {
      try {
        await processExecution(supabase, exec, journeys, metrics);
        processed++;
      } catch (execErr: any) {
        console.error(`Error processing execution ${exec.id}:`, execErr.message);
        await markExecutionError(supabase, exec.id, execErr.message);
        errors++;
      }
    }

    await refreshJourneyExecutionCounts(supabase, journeys);

    return new Response(
      JSON.stringify({
        processed,
        errors,
        emailsSent: metrics.emailsSent,
        emailsSkipped: metrics.emailsSkipped,
        total_executions: executions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("process-journeys error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});