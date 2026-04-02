CREATE OR REPLACE FUNCTION public.calculate_rfm_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Fix order_count for customers who have total_spent but order_count = 0
  UPDATE imported_customers
  SET order_count = 1
  WHERE total_spent > 0 AND (order_count IS NULL OR order_count = 0);

  -- Reset RFM scores for customers without any purchase indicators
  UPDATE imported_customers
  SET rfm_recency = NULL, rfm_frequency = NULL, rfm_monetary = NULL, rfm_score = NULL
  WHERE total_spent IS NULL OR total_spent = 0;

  -- Calculate RFM using NTILE window functions in a single pass
  UPDATE imported_customers ic
  SET 
    rfm_recency = scored.r,
    rfm_frequency = scored.f,
    rfm_monetary = scored.m,
    rfm_score = scored.r::text || scored.f::text || scored.m::text
  FROM (
    SELECT 
      id,
      NTILE(5) OVER (ORDER BY COALESCE(last_purchase_at, created_at) ASC) as r,
      NTILE(5) OVER (ORDER BY GREATEST(order_count, 1) ASC) as f,
      NTILE(5) OVER (ORDER BY total_spent ASC) as m
    FROM imported_customers
    WHERE total_spent > 0
  ) scored
  WHERE ic.id = scored.id;
END;
$$;