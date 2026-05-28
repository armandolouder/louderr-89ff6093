-- Set search path and revoke public access for pick_journey_executions
ALTER FUNCTION public.pick_journey_executions(INT) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.pick_journey_executions(INT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_journey_executions(INT) TO service_role;

-- Set search path and revoke public access for pick_automation_executions
ALTER FUNCTION public.pick_automation_executions(INT) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.pick_automation_executions(INT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_automation_executions(INT) TO service_role;
