ALTER TABLE public.nuvemshop_orders
  ADD COLUMN IF NOT EXISTS supplier text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS production_cost numeric DEFAULT NULL;