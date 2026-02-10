
-- Table to store Nuvemshop order events
CREATE TABLE public.nuvemshop_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nuvemshop_order_id BIGINT NOT NULL,
  store_id BIGINT NOT NULL,
  event TEXT NOT NULL,
  status TEXT,
  payment_status TEXT,
  shipping_status TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  products JSONB DEFAULT '[]'::jsonb,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nuvemshop_orders ENABLE ROW LEVEL SECURITY;

-- Allow all access (matches existing pattern)
CREATE POLICY "Allow all access to nuvemshop_orders"
ON public.nuvemshop_orders
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX idx_nuvemshop_orders_order_id ON public.nuvemshop_orders (nuvemshop_order_id);
CREATE INDEX idx_nuvemshop_orders_event ON public.nuvemshop_orders (event);
CREATE INDEX idx_nuvemshop_orders_store_id ON public.nuvemshop_orders (store_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.nuvemshop_orders;
