-- Add order_date column to store the actual order creation date from Nuvemshop
ALTER TABLE public.nuvemshop_orders ADD COLUMN IF NOT EXISTS order_date TIMESTAMP WITH TIME ZONE;

-- Backfill order_date from raw_data for existing records
UPDATE public.nuvemshop_orders 
SET order_date = (raw_data->>'created_at')::timestamptz
WHERE raw_data->>'created_at' IS NOT NULL AND order_date IS NULL;