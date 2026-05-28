import { NodeExecutionContext, NodeExecutor, NodeResult } from "./types.ts";

const UNIT_TO_MS: Record<string, number> = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
};

export class DelayNodeExecutor implements NodeExecutor {
  async execute(ctx: NodeExecutionContext): Promise<NodeResult> {
    const { supabase, exec, currentNode, edges } = ctx;
    const nodeData = currentNode.data;
    const delayValue = nodeData.delayValue || 1;
    const delayUnit = nodeData.delayUnit || "hours";
    const delayMs = delayValue * (UNIT_TO_MS[delayUnit] ?? UNIT_TO_MS.minutes);

    const nextEdge = edges.find((e: any) => e.source === currentNode.id);
    if (nextEdge) {
      await supabase
        .from("journey_executions")
        .update({
          current_node_id: nextEdge.target,
          next_action_at: new Date(Date.now() + delayMs).toISOString(),
          status: "active",
        })
        .eq("id", exec.id);
    } else {
      await supabase
        .from("journey_executions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", exec.id);
    }
    return { handled: true };
  }
}