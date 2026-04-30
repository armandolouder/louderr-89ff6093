import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Wallet,
  Calendar,
  Repeat,
  Trash2,
  Edit3,
  Check,
  Tag,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

type Category = { id: string; name: string; color: string; icon: string };
type Subcategory = { id: string; name: string; category_id: string };
type Expense = {
  id: string;
  description: string;
  amount: number;
  expense_type: "unica" | "mensal";
  recurrence_day: number | null;
  status: "pendente" | "pago";
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  created_at: string;
};
type Payment = { id: string; expense_id: string; reference_month: string; amount: number; paid_at: string };

export default function Expenses() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tab, setTab] = useState("despesas");

  const monthStart = useMemo(() => new Date(year, month, 1).toISOString().slice(0, 10), [year, month]);

  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["expense-subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_subcategories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Subcategory[];
    },
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["expense-payments", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_payments")
        .select("*")
        .eq("reference_month", monthStart);
      if (error) throw error;
      return data as Payment[];
    },
  });

  const monthlyExpenses = expenses.filter((e) => e.expense_type === "mensal");
  const oneTimeExpenses = expenses.filter((e) => e.expense_type === "unica");

  const paidThisMonth = useMemo(() => {
    const map = new Map(payments.map((p) => [p.expense_id, p]));
    return monthlyExpenses.map((e) => {
      const pay = map.get(e.id);
      return {
        ...e,
        paidThisMonth: !!pay,
        paidAmount: pay ? Number(pay.amount) : null,
        paymentId: pay?.id ?? null,
      };
    });
  }, [monthlyExpenses, payments]);

  // KPIs
  const totalMensal = monthlyExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const pagoMensal = paidThisMonth
    .filter((e) => e.paidThisMonth)
    .reduce((s, e) => s + Number(e.paidAmount ?? e.amount), 0);
  // Pendente = soma das despesas ainda NÃO pagas (não considera overshoot)
  const pendenteMensal = paidThisMonth
    .filter((e) => !e.paidThisMonth)
    .reduce((s, e) => s + Number(e.amount), 0);
  // Quanto pagou a mais (somatório de overshoots positivos por despesa)
  const pagoAMais = paidThisMonth
    .filter((e) => e.paidThisMonth)
    .reduce((s, e) => {
      const diff = Number(e.paidAmount ?? e.amount) - Number(e.amount);
      return s + (diff > 0 ? diff : 0);
    }, 0);
  const overshootCount = paidThisMonth.filter(
    (e) => e.paidThisMonth && Number(e.paidAmount ?? e.amount) > Number(e.amount),
  ).length;

  const monthLabel = new Date(year, month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const goPrevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const togglePaid = async (expense: Expense, currentlyPaid: boolean, customAmount?: number) => {
    if (currentlyPaid) {
      const { error } = await supabase
        .from("expense_payments")
        .delete()
        .eq("expense_id", expense.id)
        .eq("reference_month", monthStart);
      if (error) return toast.error("Erro ao desmarcar pagamento");
      toast.success("Pagamento removido");
    } else {
      const { error } = await supabase.from("expense_payments").insert({
        expense_id: expense.id,
        reference_month: monthStart,
        amount: customAmount ?? expense.amount,
      } as any);
      if (error) return toast.error("Erro ao confirmar pagamento");
      toast.success("Pagamento confirmado");
    }
    qc.invalidateQueries({ queryKey: ["expense-payments", monthStart] });
  };

  const updatePaymentAmount = async (paymentId: string, newAmount: number) => {
    const { error } = await supabase
      .from("expense_payments")
      .update({ amount: newAmount } as any)
      .eq("id", paymentId);
    if (error) return toast.error("Erro ao atualizar valor");
    toast.success("Valor pago atualizado");
    qc.invalidateQueries({ queryKey: ["expense-payments", monthStart] });
  };

  const markOneTimePaid = async (expense: Expense) => {
    const newStatus = expense.status === "pago" ? "pendente" : "pago";
    const { error } = await supabase
      .from("expenses")
      .update({ status: newStatus, paid_at: newStatus === "pago" ? new Date().toISOString() : null } as any)
      .eq("id", expense.id);
    if (error) return toast.error("Erro ao atualizar");
    toast.success(newStatus === "pago" ? "Marcada como paga" : "Marcada como pendente");
    qc.invalidateQueries({ queryKey: ["expenses"] });
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Excluir esta despesa?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Despesa excluída");
    qc.invalidateQueries({ queryKey: ["expenses"] });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-7 h-7 text-primary" />
            Despesas
          </h1>
          <p className="text-sm text-muted-foreground">Gestão de despesas mensais e únicas com categorias</p>
        </div>
        <ExpenseFormDialog categories={categories} subcategories={subcategories} />
      </div>

      {/* Filtro de mês */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="text-sm font-medium capitalize min-w-[180px] text-center">{monthLabel}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Total Mensal" value={fmt(totalMensal)} subtitle={`${monthlyExpenses.length} despesas recorrentes`} color="text-primary" bg="bg-primary/10" icon={Repeat} />
        <KPI title="Pago no mês" value={fmt(pagoMensal)} subtitle={`${paidThisMonth.filter((e) => e.paidThisMonth).length} confirmadas`} color="text-emerald-500" bg="bg-emerald-500/10" icon={Check} />
        <KPI title="Pendente" value={fmt(pendenteMensal)} subtitle={`${paidThisMonth.filter((e) => !e.paidThisMonth).length} aguardando`} color="text-warning" bg="bg-warning/10" icon={Calendar} />
        <KPI
          title="Pago a mais"
          value={fmt(pagoAMais)}
          subtitle={overshootCount > 0 ? `${overshootCount} acima do previsto` : "dentro do previsto"}
          color="text-rose-500"
          bg="bg-rose-500/10"
          icon={TrendingUp}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="despesas" className="space-y-6 mt-4">
          {/* Mensais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                Despesas Mensais ({paidThisMonth.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingExpenses ? (
                <div className="p-6 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : paidThisMonth.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa mensal cadastrada</p>
              ) : (
                <div className="divide-y divide-border">
                  {paidThisMonth.map((exp) => (
                    <ExpenseRow
                      key={exp.id}
                      expense={exp}
                      categories={categories}
                      subcategories={subcategories}
                      paid={exp.paidThisMonth}
                      paidAmount={exp.paidAmount}
                      paymentId={exp.paymentId}
                      onTogglePaid={(customAmount?: number) => togglePaid(exp, exp.paidThisMonth, customAmount)}
                      onEditPaidAmount={(amt: number) => exp.paymentId && updatePaymentAmount(exp.paymentId, amt)}
                      onDelete={() => deleteExpense(exp.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Únicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Despesas Únicas ({oneTimeExpenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {oneTimeExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa única registrada</p>
              ) : (
                <div className="divide-y divide-border">
                  {oneTimeExpenses.map((exp) => (
                    <ExpenseRow
                      key={exp.id}
                      expense={exp}
                      categories={categories}
                      subcategories={subcategories}
                      paid={exp.status === "pago"}
                      onTogglePaid={() => markOneTimePaid(exp)}
                      onDelete={() => deleteExpense(exp.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="mt-4">
          <CategoriesManager categories={categories} subcategories={subcategories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ title, value, subtitle, color, bg, icon: Icon }: any) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`p-3 ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpenseRow({
  expense,
  categories,
  subcategories,
  paid,
  paidAmount,
  paymentId,
  onTogglePaid,
  onEditPaidAmount,
  onDelete,
}: {
  expense: Expense;
  categories: Category[];
  subcategories: Subcategory[];
  paid: boolean;
  paidAmount?: number | null;
  paymentId?: string | null;
  onTogglePaid: (customAmount?: number) => void;
  onEditPaidAmount?: (amount: number) => void;
  onDelete: () => void;
}) {
  const cat = categories.find((c) => c.id === expense.category_id);
  const sub = subcategories.find((s) => s.id === expense.subcategory_id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [valueInput, setValueInput] = useState("");

  const expectedAmount = Number(expense.amount);
  const actualPaid = paidAmount != null ? Number(paidAmount) : expectedAmount;
  const diff = actualPaid - expectedAmount;

  const handleCheckboxClick = () => {
    if (paid) {
      onTogglePaid();
    } else {
      setValueInput(String(expectedAmount.toFixed(2)));
      setConfirmOpen(true);
    }
  };

  const confirmPay = () => {
    const amt = parseFloat(valueInput.replace(",", "."));
    if (!isFinite(amt) || amt < 0) return toast.error("Valor inválido");
    onTogglePaid(amt);
    setConfirmOpen(false);
  };

  const openEditPaid = () => {
    if (!paid || !paymentId) return;
    setValueInput(String(actualPaid.toFixed(2)));
    setEditOpen(true);
  };

  const saveEdit = () => {
    const amt = parseFloat(valueInput.replace(",", "."));
    if (!isFinite(amt) || amt < 0) return toast.error("Valor inválido");
    onEditPaidAmount?.(amt);
    setEditOpen(false);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <button
        onClick={handleCheckboxClick}
        className={`w-6 h-6 border-2 flex items-center justify-center transition-colors ${
          paid ? "bg-emerald-500 border-emerald-500" : "border-border hover:border-primary"
        }`}
      >
        {paid && <Check className="w-4 h-4 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${paid ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {expense.description}
          </p>
          {expense.expense_type === "mensal" && (
            <Badge variant="secondary" className="text-[10px]">
              Dia {expense.recurrence_day || "—"}
            </Badge>
          )}
          {paid && diff > 0 && (
            <Badge className="text-[10px] bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20">
              +{fmt(diff)}
            </Badge>
          )}
          {paid && diff < 0 && (
            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20">
              {fmt(diff)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {cat && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2" style={{ background: cat.color }} />
              {cat.name}
            </span>
          )}
          {sub && <span>· {sub.name}</span>}
          {expense.due_date && <span>· venc. {new Date(expense.due_date).toLocaleDateString("pt-BR")}</span>}
        </div>
      </div>
      <div className="text-right">
        {paid && paymentId ? (
          <button
            onClick={openEditPaid}
            className="group flex flex-col items-end hover:opacity-80 transition-opacity"
            title="Clique para editar o valor pago"
          >
            <p className={`text-sm font-bold ${diff > 0 ? "text-rose-500" : diff < 0 ? "text-emerald-500" : "text-foreground"}`}>
              {fmt(actualPaid)}
            </p>
            {diff !== 0 && (
              <p className="text-[10px] text-muted-foreground line-through">{fmt(expectedAmount)}</p>
            )}
            <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 flex items-center gap-1">
              <Edit3 className="w-2.5 h-2.5" /> editar
            </span>
          </button>
        ) : (
          <p className="text-sm font-bold text-foreground">{fmt(expectedAmount)}</p>
        )}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Excluir despesa</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Diálogo: confirmar pagamento com valor customizado */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Valor previsto: <span className="font-medium text-foreground">{fmt(expectedAmount)}</span>
            </p>
            <div>
              <Label>Valor realmente pago (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && confirmPay()}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Ajuste se pagou um valor diferente (juros, multa, desconto…)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmPay}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: editar valor pago */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar valor pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Valor previsto: <span className="font-medium text-foreground">{fmt(expectedAmount)}</span>
            </p>
            <div>
              <Label>Valor pago (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveEdit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExpenseFormDialog({ categories, subcategories }: { categories: Category[]; subcategories: Subcategory[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    expense_type: "unica" as "unica" | "mensal",
    recurrence_day: "5",
    category_id: "",
    subcategory_id: "",
    due_date: "",
    payment_method: "",
    notes: "",
  });

  const subs = subcategories.filter((s) => s.category_id === form.category_id);

  const submit = async () => {
    if (!form.description || !form.amount) {
      toast.error("Preencha descrição e valor");
      return;
    }
    const payload: any = {
      description: form.description,
      amount: parseFloat(form.amount),
      expense_type: form.expense_type,
      recurrence_day: form.expense_type === "mensal" ? parseInt(form.recurrence_day) : null,
      category_id: form.category_id || null,
      subcategory_id: form.subcategory_id || null,
      due_date: form.due_date || null,
      payment_method: form.payment_method || null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("expenses").insert(payload);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Despesa cadastrada");
    qc.invalidateQueries({ queryKey: ["expenses"] });
    setOpen(false);
    setForm({ description: "", amount: "", expense_type: "unica", recurrence_day: "5", category_id: "", subcategory_id: "", due_date: "", payment_method: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Nova Despesa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Despesa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Descrição *</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Aluguel do escritório" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.expense_type} onValueChange={(v: any) => setForm({ ...form, expense_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Despesa Única</SelectItem>
                  <SelectItem value="mensal">Despesa Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.expense_type === "mensal" && (
            <div>
              <Label>Dia de vencimento (1-31)</Label>
              <Input type="number" min="1" max="31" value={form.recurrence_day} onChange={(e) => setForm({ ...form, recurrence_day: e.target.value })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v, subcategory_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">Cadastre categorias na aba "Categorias"</div>
                  ) : categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subcategoria</Label>
              <Select value={form.subcategory_id} onValueChange={(v) => setForm({ ...form, subcategory_id: v })} disabled={!form.category_id}>
                <SelectTrigger><SelectValue placeholder={form.category_id ? "Selecionar" : "—"} /></SelectTrigger>
                <SelectContent>
                  {subs.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.expense_type === "unica" && (
            <div>
              <Label>Data de vencimento</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          )}
          <div>
            <Label>Forma de pagamento</Label>
            <Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="PIX, cartão, boleto..." />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesManager({ categories, subcategories }: { categories: Category[]; subcategories: Subcategory[] }) {
  const qc = useQueryClient();
  const [newCat, setNewCat] = useState({ name: "", color: "#6366f1" });
  const [newSub, setNewSub] = useState<Record<string, string>>({});

  const addCategory = async () => {
    if (!newCat.name) return toast.error("Informe um nome");
    const { error } = await supabase.from("expense_categories").insert(newCat as any);
    if (error) return toast.error("Erro ao criar categoria");
    toast.success("Categoria criada");
    setNewCat({ name: "", color: "#6366f1" });
    qc.invalidateQueries({ queryKey: ["expense-categories"] });
  };

  const addSubcategory = async (categoryId: string) => {
    const name = newSub[categoryId];
    if (!name) return;
    const { error } = await supabase.from("expense_subcategories").insert({ name, category_id: categoryId } as any);
    if (error) return toast.error("Erro ao criar subcategoria");
    toast.success("Subcategoria criada");
    setNewSub({ ...newSub, [categoryId]: "" });
    qc.invalidateQueries({ queryKey: ["expense-subcategories"] });
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Excluir categoria e suas subcategorias?")) return;
    const { error } = await supabase.from("expense_categories").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    qc.invalidateQueries({ queryKey: ["expense-categories"] });
    qc.invalidateQueries({ queryKey: ["expense-subcategories"] });
  };

  const deleteSub = async (id: string) => {
    const { error } = await supabase.from("expense_subcategories").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    qc.invalidateQueries({ queryKey: ["expense-subcategories"] });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" /> Nova Categoria
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Nome da categoria" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          <Input type="color" className="w-16 p-1" value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} />
          <Button onClick={addCategory}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
        </CardContent>
      </Card>

      {categories.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const subs = subcategories.filter((s) => s.category_id === cat.id);
            return (
              <Card key={cat.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3" style={{ background: cat.color }} />
                      <CardTitle className="text-sm">{cat.name}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCategory(cat.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {subs.length > 0 && (
                    <div className="space-y-1">
                      {subs.map((s) => (
                        <div key={s.id} className="flex items-center justify-between px-2 py-1 bg-muted/50 text-xs">
                          <span className="flex items-center gap-1.5"><Layers className="w-3 h-3 text-muted-foreground" />{s.name}</span>
                          <button onClick={() => deleteSub(s.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Input
                      placeholder="Nova subcategoria"
                      value={newSub[cat.id] || ""}
                      onChange={(e) => setNewSub({ ...newSub, [cat.id]: e.target.value })}
                      className="h-8 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && addSubcategory(cat.id)}
                    />
                    <Button size="sm" variant="outline" className="h-8" onClick={() => addSubcategory(cat.id)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}