import { useState } from "react";
import { useTodos, Todo } from "@/hooks/useTodos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Calendar, CheckCircle2, Circle, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const priorityConfig = {
  low: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  medium: { label: "Média", className: "bg-primary/20 text-primary" },
  high: { label: "Alta", className: "bg-destructive/20 text-destructive" },
};

export default function Todos() {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo } = useTodos();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const handleAdd = async () => {
    if (!title.trim()) return;
    try {
      await addTodo.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || undefined,
      });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setOpen(false);
      toast.success("Tarefa criada!");
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  };

  const filtered = todos.filter((t) => {
    if (filter === "pending") return !t.is_completed;
    if (filter === "done") return t.is_completed;
    return true;
  });

  const pending = todos.filter((t) => !t.is_completed).length;
  const done = todos.filter((t) => t.is_completed).length;

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-primary" />
            Tarefas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pending} pendente{pending !== 1 ? "s" : ""} · {done} concluída{done !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Tarefa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input placeholder="Título da tarefa" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">Prioridade</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">Data limite</label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleAdd} disabled={!title.trim() || addTodo.isPending} className="w-full">
                {addTodo.isPending ? "Criando..." : "Criar Tarefa"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        {(["all", "pending", "done"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "Todas" : f === "pending" ? "Pendentes" : "Concluídas"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mb-3 opacity-30" />
            <p>{filter === "done" ? "Nenhuma tarefa concluída" : filter === "pending" ? "Nenhuma tarefa pendente 🎉" : "Nenhuma tarefa criada"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={() => toggleTodo.mutate({ id: todo.id, is_completed: !todo.is_completed })}
              onDelete={() => {
                deleteTodo.mutate(todo.id);
                toast.success("Tarefa removida");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete }: { todo: Todo; onToggle: () => void; onDelete: () => void }) {
  const p = priorityConfig[todo.priority as keyof typeof priorityConfig] || priorityConfig.medium;

  return (
    <Card className={cn("transition-all", todo.is_completed && "opacity-60")}>
      <CardContent className="flex items-start gap-3 p-4">
        <Checkbox checked={todo.is_completed} onCheckedChange={onToggle} className="mt-1" />
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium text-foreground", todo.is_completed && "line-through text-muted-foreground")}>
            {todo.title}
          </p>
          {todo.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{todo.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className={cn("text-xs", p.className)}>{p.label}</Badge>
            {todo.due_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(todo.due_date + "T12:00:00"), "dd MMM", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive shrink-0">
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
