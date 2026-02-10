import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Zap,
  Clock,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useAutomationFlows,
  useDeleteAutomationFlow,
  useSaveAutomationFlow,
  TRIGGER_EVENTS,
  AutomationFlow,
} from "@/hooks/useAutomationFlows";
import { toast } from "sonner";

interface FlowsListProps {
  onEdit: (flow: AutomationFlow) => void;
  onNew: () => void;
}

export function FlowsList({ onEdit, onNew }: FlowsListProps) {
  const { data: flows, isLoading } = useAutomationFlows();
  const deleteFlow = useDeleteAutomationFlow();
  const saveFlow = useSaveAutomationFlow();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getTriggerLabel = (event: string) =>
    TRIGGER_EVENTS.find((t) => t.value === event)?.label || event;

  const getDelayLabel = (value: number, unit: string) => {
    const u = unit === "minutes" ? "min" : unit === "hours" ? "h" : "d";
    return `${value}${u}`;
  };

  const toggleStatus = async (flow: AutomationFlow) => {
    const newStatus = flow.status === "active" ? "inactive" : "active";
    try {
      await saveFlow.mutateAsync({ id: flow.id, status: newStatus } as any);
      toast.success(newStatus === "active" ? "Fluxo ativado" : "Fluxo desativado");
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteFlow.mutateAsync(deleteId);
      toast.success("Fluxo excluído");
    } catch {
      toast.error("Erro ao excluir fluxo");
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automações</h1>
          <p className="text-sm text-muted-foreground">
            Fluxos automáticos de WhatsApp acionados por eventos da loja
          </p>
        </div>
        <Button onClick={onNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Fluxo
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Gatilho</TableHead>
              <TableHead>Delay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : !flows?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum fluxo criado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crie seu primeiro fluxo automático de mensagens
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              flows.map((flow) => (
                <TableRow key={flow.id}>
                  <TableCell className="font-medium">{flow.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getTriggerLabel(flow.trigger_event)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {getDelayLabel(flow.delay_value, flow.delay_unit)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(flow)} className="cursor-pointer">
                      {flow.status === "active" ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                          <ToggleRight className="w-3 h-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <ToggleLeft className="w-3 h-3" />
                          Inativo
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(flow)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(flow.id)}
                        className="text-destructive hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fluxo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fluxo será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
