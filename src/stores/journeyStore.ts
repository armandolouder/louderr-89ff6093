import { create } from "zustand";

export type JourneyNodeType = "trigger" | "message" | "delay" | "condition" | "end";

export interface JourneyNodeData {
  label: string;
  type: JourneyNodeType;
  channel?: "email" | "whatsapp" | "both";
  templateId?: string;
  templateName?: string;
  messageContent?: string;
  delayValue?: number;
  delayUnit?: "minutes" | "hours" | "days";
  triggerEvent?: string;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
}

export interface JourneyNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: JourneyNodeData;
}

export interface JourneyEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface Journey {
  id?: string;
  name: string;
  description?: string;
  trigger_event: string;
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  kill_conditions: string[];
  status: string;
  is_active: boolean;
}

interface JourneyStore {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
}

export const useJourneyStore = create<JourneyStore>((set) => ({
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
}));
