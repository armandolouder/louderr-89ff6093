CREATE OR REPLACE FUNCTION public.get_email_attribution(p_window_days int DEFAULT 7)
RETURNS TABLE(
  campaign_id uuid,
  campaign_name text,
  emails_sent bigint,
  attributed_orders bigint,
  revenue numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH sent AS (
    SELECT eq.campaign_id, lower(eq.email) AS email, eq.sent_at, eq.user_id
    FROM email_queue eq
    WHERE eq.status = 'sent'
      AND eq.sent_at IS NOT NULL
      AND eq.campaign_id IS NOT NULL
      AND eq.user_id = auth.uid()
  ),
  attributed AS (
    SELECT DISTINCT ON (o.id)
      o.id AS order_id,
      o.total,
      s.campaign_id
    FROM nuvemshop_orders o
    JOIN sent s
      ON s.user_id = o.user_id
      AND s.email = lower(o.customer_email)
      AND o.order_date > s.sent_at
      AND o.order_date <= s.sent_at + (p_window_days || ' days')::interval
    WHERE o.user_id = auth.uid()
      AND o.payment_status = 'paid'
      AND o.customer_email IS NOT NULL
    ORDER BY o.id, s.sent_at DESC
  )
  SELECT
    c.id,
    c.name,
    (SELECT count(*) FROM sent s2 WHERE s2.campaign_id = c.id) AS emails_sent,
    count(a.order_id) AS attributed_orders,
    COALESCE(sum(a.total), 0) AS revenue
  FROM email_campaigns c
  LEFT JOIN attributed a ON a.campaign_id = c.id
  WHERE c.user_id = auth.uid()
  GROUP BY c.id, c.name
  ORDER BY revenue DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_attribution(int) TO authenticated;