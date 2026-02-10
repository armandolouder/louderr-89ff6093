-- Add unique constraint on nuvemshop_order_id for upsert support
ALTER TABLE public.nuvemshop_orders ADD CONSTRAINT nuvemshop_orders_nuvemshop_order_id_key UNIQUE (nuvemshop_order_id);