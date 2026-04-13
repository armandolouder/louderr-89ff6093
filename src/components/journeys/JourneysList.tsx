import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Play, Pause, Route } from "lucide-react";
import { useJourneys, useDeleteJourney, useSaveJourney, type JourneyRow } from "@/hooks/useJourneys";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  onEdit: (journey: JourneyRow) => void;
  onNew: () => void;
}

const TRIGGER_LABELS: Record<string, string> = {
  visit: "Visita",
  cart: "Carrinho",
  purchase: "Compra",
  packed: "Embalado",
  delivered: "Entregue",
};

export function JourneysList({ onEdit, onNew }: Props) {
  const { data: journeys, isLoading } = useJourneys();
  const deleteJourney = useDeleteJourney();
  const saveJourney = useSaveJourney();
  const { toast } = useToast();

  const toggleActive = async (j: JourneyRow) => {
    try {
      await saveJourney.mutateAsync({
        id: j.id,
        name: j.name,
        trigger_event: j.trigger_event,
        nodes: j.nodes,
        edges: j.edges,
        kill_conditions: j.kill_conditions,
        status: j.is_active ? "draft" : "active",
        is_active: !j.is_active,
      });
      toast({ title: j.is_active ? "Jornada pausada" : "Jornada ativada" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteJourney.mutateAsync(id);
      toast({ title: "Jornada excluída" });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Route className="w-6 h-6 text-primary" />
            Jornada do Cliente
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Automatize a comunicação multicanal com seus clientes</p>
        </div>
        <Button onClick={onNew}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Jornada
        </Button>
      </div>

      {(!journeys || journeys.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Route className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhuma jornada criada ainda</p>
            <Button className="mt-4" onClick={onNew}>
              <Plus className="w-4 h-4 mr-1.5" />
              Criar primeira jornada
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {journeys.map((j) => (
            <Card key={j.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${j.is_active ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                  <div>
                    <p className="font-medium">{j.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {TRIGGER_LABELS[j.trigger_event] || j.trigger_event}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {j.execution_count} execuções
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(j)}>
                    {j.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(j)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(j.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
