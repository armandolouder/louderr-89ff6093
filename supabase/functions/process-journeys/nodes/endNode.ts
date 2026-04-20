import { completeExecution } from "../executionUpdater.ts";
import { NodeExecutionContext, NodeExecutor, NodeResult } from "./types.ts";

export class EndNodeExecutor implements NodeExecutor {
  async execute(ctx: NodeExecutionContext): Promise<NodeResult> {
    await completeExecution(ctx.supabase, ctx.exec.id);
    return { handled: true };
  }
}