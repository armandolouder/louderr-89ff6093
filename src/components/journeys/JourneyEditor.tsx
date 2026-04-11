import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2, ScrollText } from "lucide-react";
import { JourneyCanvas } from "./JourneyCanvas";
import { JourneyExecutionLogs } from "./JourneyExecutionLogs";
import { useSaveJourney, type JourneyRow } from "@/hooks/useJourneys";
import { useToast } from "@/hooks/use-toast";
import type { Node, Edge } from "@xyflow/react";

interface Props {
  journey: JourneyRow | null;
  onBack: () => void;
}

export function JourneyEditor({ journey, onBack }: Props) {
  const { toast } = useToast();
  const saveJourney = useSaveJourney();
  const [showLogs, setShowLogs] = useState(false);

  const [name, setName] = useState(journey?.name || "Nova Jornada");
  const [isActive, setIsActive] = useState(journey?.is_active || false);
  const [nodes, setNodes] = useState<Node[]>(() => {
    if (journey?.nodes && Array.isArray(journey.nodes) && journey.nodes.length > 0) {
      return journey.nodes as Node[];
    }
    return [
      {
        id: "trigger_1",
        type: "trigger",
        position: { x: 50, y: 200 },
        data: { label: "Trigger", type: "trigger", triggerEvent: "visit" },
      },
    ];
  });
  const [edges, setEdges] = useState<Edge[]>(() => {
    if (journey?.edges && Array.isArray(journey.edges) && journey.edges.length > 0) {
      return journey.edges as Edge[];
    }
    return [];
  });

  const handleNodesChange = useCallback((newNodes: Node[]) => setNodes(newNodes), []);
  const handleEdgesChange = useCallback((newEdges: Edge[]) => setEdges(newEdges), []);

  const triggerNode = nodes.find((n) => n.type === "trigger");
  const triggerEvent = (triggerNode?.data as any)?.triggerEvent || "visit";

  const handleSave = async () => {
    try {
      await saveJourney.mutateAsync({
        id: journey?.id,
        name,
        trigger_event: triggerEvent,
        nodes: nodes as any,
        edges: edges as any,
        kill_conditions: journey?.kill_conditions || [],
        status: isActive ? "active" : "draft",
        is_active: isActive,
      });
      toast({ title: "Jornada salva com sucesso!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 max-w-xs text-sm font-semibold border-none bg-transparent focus-visible:ring-1"
        />
        <div className="flex items-center gap-2 ml-auto">
          {journey?.id && (
            <Button
              variant={showLogs ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
            >
              <ScrollText className="w-3.5 h-3.5 mr-1" />
              Logs
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{isActive ? "Ativo" : "Inativo"}</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Button size="sm" onClick={handleSave} disabled={saveJourney.isPending}>
            {saveJourney.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Canvas + Logs */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <JourneyCanvas
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
          />
        </div>
        {showLogs && journey?.id && (
          <div className="w-80 border-l border-border bg-card/50 flex flex-col">
            <div className="px-3 py-2 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <ScrollText className="w-4 h-4 text-primary" />
                Log de Disparos
              </h3>
              <p className="text-[10px] text-muted-foreground">Últimas 50 execuções</p>
            </div>
            <JourneyExecutionLogs journeyId={journey.id} />
          </div>
        )}
      </div>
    </div>
  );
}