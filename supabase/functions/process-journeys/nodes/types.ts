// Shared context passed to every node executor
export interface NodeExecutionContext {
  supabase: any;
  exec: any;
  journey: any;
  currentNode: any;
  edges: any[];
  metrics: ExecutionMetrics;
}

export interface ExecutionMetrics {
  emailsSent: number;
  emailsSkipped: number;
}

// Result tells the orchestrator whether the execution row was already advanced
// (e.g., a wait/retry scheduled) or if the orchestrator should advance to the
// next node based on edges.
export interface NodeResult {
  // When true, the executor handled execution row updates itself (wait, complete...)
  handled: boolean;
  // Optional extra data to merge when advancing to the next node
  extraData?: Record<string, any>;
}

export interface NodeExecutor {
  execute(ctx: NodeExecutionContext): Promise<NodeResult>;
}