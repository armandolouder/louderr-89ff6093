
-- Create abandoned checkouts table
CREATE TABLE public.nuvemshop_abandoned_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkout_id BIGINT NOT NULL UNIQUE,
  store_id BIGINT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  recovery_url TEXT,
  total NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  products JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'abandoned',
  created_at_nuvemshop TIMESTAMP WITH TIME ZONE,
  updated_at_nuvemshop TIMESTAMP WITH TIME ZONE,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contacted_at TIMESTAMP WITH TIME ZONE,
  contact_channel TEXT,
  recovered BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.nuvemshop_abandoned_checkouts ENABLE ROW LEVEL SECURITY;

-- Allow all access (same pattern as other tables)
CREATE POLICY "Allow all access to nuvemshop_abandoned_checkouts"
ON public.nuvemshop_abandoned_checkouts
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.nuvemshop_abandoned_checkouts;

-- Trigger for updated_at
CREATE TRIGGER update_abandoned_checkouts_updated_at
BEFORE UPDATE ON public.nuvemshop_abandoned_checkouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
