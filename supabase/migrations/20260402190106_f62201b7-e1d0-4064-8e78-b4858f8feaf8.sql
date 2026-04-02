CREATE OR REPLACE FUNCTION public.calculate_rfm_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Reset RFM scores for customers without purchases
  UPDATE imported_customers
  SET rfm_recency = NULL, rfm_frequency = NULL, rfm_monetary = NULL, rfm_score = NULL
  WHERE (last_purchase_at IS NULL OR order_count IS NULL OR order_count = 0)
    AND rfm_score IS NOT NULL;

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
      NTILE(5) OVER (ORDER BY last_purchase_at ASC) as r,
      NTILE(5) OVER (ORDER BY order_count ASC) as f,
      NTILE(5) OVER (ORDER BY total_spent ASC) as m
    FROM imported_customers
    WHERE last_purchase_at IS NOT NULL 
      AND order_count IS NOT NULL 
      AND order_count > 0
  ) scored
  WHERE ic.id = scored.id;
END;
$$;