// Helpers to transition journey executions between nodes
export async function advanceToNextNode(
  supabase: any,
  execId: string,
  edges: any[],
  currentNodeId: string,
  extraData?: Record<string, any>
): Promise<void> {
  const nextEdge = edges.find((e: any) => e.source === currentNodeId);
  const update: Record<string, any> = extraData ? { ...extraData } : {};

  if (nextEdge) {
    update.current_node_id = nextEdge.target;
    update.next_action_at = new Date().toISOString();
    update.status = "active";
  } else {
    update.status = "completed";
    update.completed_at = new Date().toISOString();
  }

  await supabase.from("journey_executions").update(update).eq("id", execId);
}

export async function markExecutionError(
  supabase: any,
  execId: string,
  message: string
): Promise<void> {
  await supabase
    .from("journey_executions")
    .update({ status: "error", error_message: message })
    .eq("id", execId);
}

export async function completeExecution(
  supabase: any,
  execId: string,
  errorMessage?: string
): Promise<void> {
  const update: Record<string, any> = {
    status: "completed",
    completed_at: new Date().toISOString(),
  };
  if (errorMessage) update.error_message = errorMessage;
  await supabase.from("journey_executions").update(update).eq("id", execId);
}