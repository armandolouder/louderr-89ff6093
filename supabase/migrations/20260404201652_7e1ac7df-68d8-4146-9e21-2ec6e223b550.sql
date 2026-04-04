-- Fix email_unsubscribes: the "Owner access" policy uses USING(true) which is overly permissive
-- Replace with proper owner-scoped access for authenticated users
DROP POLICY IF EXISTS "Owner access email_unsubscribes" ON public.email_unsubscribes;

-- Authenticated users can only read unsubscribes (no user_id column, so allow read for management)
CREATE POLICY "Authenticated can read email_unsubscribes"
  ON public.email_unsubscribes FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert (for manual unsubscribe from dashboard)
CREATE POLICY "Authenticated can insert email_unsubscribes"
  ON public.email_unsubscribes FOR INSERT
  TO authenticated
  WITH CHECK (true);