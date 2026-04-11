import { useCallback, useRef, useState, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TriggerNode } from "./nodes/TriggerNode";
import { MessageNode } from "./nodes/MessageNode";
import { DelayNode } from "./nodes/DelayNode";
import { EndNode } from "./nodes/EndNode";
import { JourneyBuilderSidebar } from "./JourneyBuilderSidebar";
import { JourneyNodeProperties } from "./JourneyNodeProperties";
import type { JourneyNodeData } from "@/stores/journeyStore";

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  delay: DelayNode,
  end: EndNode,
};

interface Props {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
}

let nodeId = 0;
const getId = () => `node_${++nodeId}`;

export function JourneyCanvas({ initialNodes, initialEdges, onNodesChange, onEdgesChange }: Props) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rfInstance, setRfInstance] = useState<any>(null);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId), [nodes, selectedNodeId]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...params, animated: true }, eds);
        onEdgesChange(next);
        return next;
      });
    },
    [onEdgesChange, setEdges]
  );

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChangeInternal(changes);
      // Sync back after React render
      setTimeout(() => {
        setNodes((nds) => {
          onNodesChange(nds);
          return nds;
        });
      }, 0);
    },
    [onNodesChangeInternal, onNodesChange, setNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChangeInternal(changes);
      setTimeout(() => {
        setEdges((eds) => {
          onEdgesChange(eds);
          return eds;
        });
      }, 0);
    },
    [onEdgesChangeInternal, onEdgesChange, setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow-type");
      const channel = e.dataTransfer.getData("application/reactflow-channel");
      const label = e.dataTransfer.getData("application/reactflow-label");

      if (!type || !rfInstance) return;

      const position = rfInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: {
          label: label || type,
          type,
          channel: channel || undefined,
          triggerEvent: type === "trigger" ? "visit" : undefined,
          delayValue: type === "delay" ? 1 : undefined,
          delayUnit: type === "delay" ? "hours" : undefined,
        } as JourneyNodeData,
      };

      setNodes((nds) => {
        const next = [...nds, newNode];
        onNodesChange(next);
        return next;
      });
    },
    [rfInstance, setNodes, onNodesChange]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeData = useCallback(
    (id: string, newData: Partial<JourneyNodeData>) => {
      setNodes((nds) => {
        const next = nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...newData } } : n
        );
        onNodesChange(next);
        return next;
      });
    },
    [setNodes, onNodesChange]
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => {
        const next = nds.filter((n) => n.id !== id);
        onNodesChange(next);
        return next;
      });
      setEdges((eds) => {
        const next = eds.filter((e) => e.source !== id && e.target !== id);
        onEdgesChange(next);
        return next;
      });
      setSelectedNodeId(null);
    },
    [setNodes, setEdges, onNodesChange, onEdgesChange]
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      <JourneyBuilderSidebar />
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onInit={setRfInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          className="bg-background"
        >
          <Controls className="!bg-card !border-border !rounded-lg" />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
        </ReactFlow>
      </div>
      {selectedNode && (
        <JourneyNodeProperties
          nodeId={selectedNode.id}
          data={selectedNode.data as JourneyNodeData}
          onUpdate={updateNodeData}
          onDelete={deleteNode}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}
