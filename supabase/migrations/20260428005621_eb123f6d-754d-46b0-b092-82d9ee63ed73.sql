-- Categorias de despesas
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'wallet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES public.expense_subcategories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expense_type TEXT NOT NULL DEFAULT 'unica', -- 'unica' | 'mensal'
  recurrence_day INTEGER, -- dia do mês para recorrentes (1-31)
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'pago'
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pagamentos confirmados de despesas mensais (1 por mês/despesa)
CREATE TABLE public.expense_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL, -- primeiro dia do mês de competência
  amount NUMERIC(12,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(expense_id, reference_month)
);

-- RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner access expense_categories" ON public.expense_categories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access expense_subcategories" ON public.expense_subcategories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access expenses" ON public.expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access expense_payments" ON public.expense_payments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Triggers de user_id e updated_at
CREATE TRIGGER set_user_id_expense_categories BEFORE INSERT ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_expense_subcategories BEFORE INSERT ON public.expense_subcategories FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_expenses BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_expense_payments BEFORE INSERT ON public.expense_payments FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER updated_at_expense_categories BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER updated_at_expense_subcategories BEFORE UPDATE ON public.expense_subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER updated_at_expenses BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_expense_subcat_cat ON public.expense_subcategories(category_id);
CREATE INDEX idx_expenses_user_status ON public.expenses(user_id, status);
CREATE INDEX idx_expense_payments_month ON public.expense_payments(expense_id, reference_month);