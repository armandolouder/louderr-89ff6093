DELETE FROM public.email_templates a
USING public.email_templates b
WHERE a.category = 'recuperacao'
  AND b.category = 'recuperacao'
  AND a.name = b.name
  AND (a.created_at > b.created_at OR (a.created_at = b.created_at AND a.id > b.id));