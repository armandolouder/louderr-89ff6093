-- 1. Prevent duplicate journey executions for the same order and journey
CREATE UNIQUE INDEX IF NOT EXISTS idx_journey_executions_order_dedup 
ON public.journey_executions (journey_id, customer_phone, (execution_data->>'trigger_order_id')) 
WHERE (execution_data->>'trigger_order_id') IS NOT NULL;

-- 2. Prevent duplicate legacy automation executions for the same order and flow
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_executions_order_dedup 
ON public.automation_executions (flow_id, phone, (trigger_data->>'order_id')) 
WHERE (trigger_data->>'order_id') IS NOT NULL;

-- 3. RPC to atomically pick journey executions for processing
CREATE OR REPLACE FUNCTION public.pick_journey_executions(batch_size INT)
RETURNS SETOF public.journey_executions AS $$
BEGIN
    RETURN QUERY
    UPDATE public.journey_executions
    SET status = 'processing', updated_at = now()
    WHERE id IN (
        SELECT id
        FROM public.journey_executions
        WHERE status = 'active' AND next_action_at <= now()
        ORDER BY next_action_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC to atomically pick automation executions for processing
CREATE OR REPLACE FUNCTION public.pick_automation_executions(batch_size INT)
RETURNS SETOF public.automation_executions AS $$
BEGIN
    RETURN QUERY
    UPDATE public.automation_executions
    SET status = 'processing'
    WHERE id IN (
        SELECT id
        FROM public.automation_executions
        WHERE status = 'pending' AND scheduled_at <= now()
        ORDER BY scheduled_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to service_role (used by Edge Functions)
GRANT EXECUTE ON FUNCTION public.pick_journey_executions(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.pick_automation_executions(INT) TO service_role;
