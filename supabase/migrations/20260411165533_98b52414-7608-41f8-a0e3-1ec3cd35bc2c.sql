
-- Customer Journeys table
CREATE TABLE public.customer_journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  kill_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  is_active BOOLEAN NOT NULL DEFAULT false,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner access customer_journeys"
  ON public.customer_journeys FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_user_id_customer_journeys
  BEFORE INSERT ON public.customer_journeys
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER update_updated_at_customer_journeys
  BEFORE UPDATE ON public.customer_journeys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Journey Executions table
CREATE TABLE public.journey_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  journey_id UUID REFERENCES public.customer_journeys(id) ON DELETE CASCADE NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_name TEXT,
  current_node_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  next_action_at TIMESTAMPTZ,
  execution_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journey_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner access journey_executions"
  ON public.journey_executions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_user_id_journey_executions
  BEFORE INSERT ON public.journey_executions
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER update_updated_at_journey_executions
  BEFORE UPDATE ON public.journey_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
