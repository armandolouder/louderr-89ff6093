-- 1. Lock down INSERT on meta_webhook_events to service_role only
DROP POLICY IF EXISTS "Service insert meta_webhook_events" ON public.meta_webhook_events;

CREATE POLICY "Service role can insert meta_webhook_events"
  ON public.meta_webhook_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

REVOKE INSERT ON public.meta_webhook_events FROM anon, authenticated;

-- 2. Revoke client EXECUTE on server-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.increment_campaign_sent(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_webhook_owner_user_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_meta_user_by_verify_token(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_rfm_scores() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pick_automation_executions(integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pick_journey_executions(integer) FROM anon, authenticated;