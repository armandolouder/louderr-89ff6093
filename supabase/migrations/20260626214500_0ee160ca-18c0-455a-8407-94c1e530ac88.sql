ALTER TABLE public.variation_models ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.variation_models
)
UPDATE public.variation_models m SET position = o.rn FROM ordered o WHERE m.id = o.id;