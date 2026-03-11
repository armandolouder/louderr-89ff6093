-- Remove duplicates before adding unique constraints
WITH duplicated_orders AS (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY nuvemshop_order_id
             ORDER BY updated_at DESC, created_at DESC, id DESC
           ) AS rn
    FROM public.nuvemshop_orders
    WHERE nuvemshop_order_id IS NOT NULL
  ) t
  WHERE t.rn > 1
)
DELETE FROM public.nuvemshop_orders
WHERE id IN (SELECT id FROM duplicated_orders);

WITH duplicated_checkouts AS (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY nuvemshop_checkout_id
             ORDER BY updated_at DESC, created_at DESC, id DESC
           ) AS rn
    FROM public.nuvemshop_abandoned_checkouts
    WHERE nuvemshop_checkout_id IS NOT NULL
  ) t
  WHERE t.rn > 1
)
DELETE FROM public.nuvemshop_abandoned_checkouts
WHERE id IN (SELECT id FROM duplicated_checkouts);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nuvemshop_orders_nuvemshop_order_id_key'
      AND conrelid = 'public.nuvemshop_orders'::regclass
  ) THEN
    ALTER TABLE public.nuvemshop_orders
      ADD CONSTRAINT nuvemshop_orders_nuvemshop_order_id_key UNIQUE (nuvemshop_order_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nuvemshop_abandoned_checkouts_nuvemshop_checkout_id_key'
      AND conrelid = 'public.nuvemshop_abandoned_checkouts'::regclass
  ) THEN
    ALTER TABLE public.nuvemshop_abandoned_checkouts
      ADD CONSTRAINT nuvemshop_abandoned_checkouts_nuvemshop_checkout_id_key UNIQUE (nuvemshop_checkout_id);
  END IF;
END $$;