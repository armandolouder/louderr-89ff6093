
CREATE TABLE public.todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to todos" ON public.todos FOR ALL TO public USING (true) WITH CHECK (true);
