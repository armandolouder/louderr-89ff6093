ALTER TABLE public.nuvemshop_orders 
ADD COLUMN IF NOT EXISTS order_number text,
ADD COLUMN IF NOT EXISTS payment_method text;

-- Backfill from raw_data
UPDATE public.nuvemshop_orders 
SET order_number = raw_data->>'number',
    payment_method = raw_data->'payment_details'->>'method'
WHERE raw_data IS NOT NULL;