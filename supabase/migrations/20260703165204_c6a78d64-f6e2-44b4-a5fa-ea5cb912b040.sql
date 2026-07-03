ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS variations_applied_at timestamp with time zone;

UPDATE public.catalog_products p
SET variations_applied_at = COALESCE(p.updated_at, now())
WHERE variations_applied_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.catalog_variants v WHERE v.product_id = p.id);