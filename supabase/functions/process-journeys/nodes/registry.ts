import { NodeExecutor } from "./types.ts";
import { MessageNodeExecutor } from "./messageNode.ts";
import { DelayNodeExecutor } from "./delayNode.ts";
import { EndNodeExecutor } from "./endNode.ts";

// Registry maps node "type" to its executor (Strategy Pattern).
// Adding new node types is now an O/C operation: register here, add file.
export const nodeExecutors: Record<string, NodeExecutor> = {
  message: new MessageNodeExecutor(),
  delay: new DelayNodeExecutor(),
  end: new EndNodeExecutor(),
};

export function getExecutorFor(nodeType: string): NodeExecutor | null {
  return nodeExecutors[nodeType] ?? null;
}