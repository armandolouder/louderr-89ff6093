UPDATE public.customer_clusters c
SET user_id = (SELECT user_id FROM public.imported_customers GROUP BY user_id ORDER BY count(*) DESC LIMIT 1)
WHERE c.user_id IS NULL;