DROP POLICY IF EXISTS "Allow authenticated users to update media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view media" ON storage.objects;

CREATE INDEX IF NOT EXISTS idx_customer_journeys_active_status
  ON public.customer_journeys (is_active, status);

CREATE INDEX IF NOT EXISTS idx_page_views_visitor_email_created
  ON public.page_views (visitor_id, created_at DESC)
  WHERE customer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ns_carts_recovery_pending
  ON public.nuvemshop_abandoned_checkouts (recovery_status, created_at ASC)
  WHERE recovered IS FALSE;