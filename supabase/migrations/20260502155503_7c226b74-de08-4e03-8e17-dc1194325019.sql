ALTER TABLE public.nuvemshop_orders
ADD COLUMN IF NOT EXISTS paid_to_supplier boolean NOT NULL DEFAULT false;