-- Recovery engine tables

CREATE TABLE public.recovery_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  steps jsonb DEFAULT '[]'::jsonb,
  segmentation_rules jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recovery_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to recovery_flows" ON public.recovery_flows FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.recovery_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id uuid REFERENCES public.nuvemshop_abandoned_checkouts(id) ON DELETE CASCADE,
  flow_id uuid REFERENCES public.recovery_flows(id) ON DELETE SET NULL,
  current_step integer DEFAULT 0,
  status text DEFAULT 'active',
  customer_phone text,
  customer_email text,
  customer_name text,
  cart_value numeric DEFAULT 0,
  cart_items jsonb DEFAULT '[]'::jsonb,
  recovery_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.recovery_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to recovery_executions" ON public.recovery_executions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.recovery_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid REFERENCES public.recovery_executions(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  channel text NOT NULL,
  variant text DEFAULT 'A',
  content text,
  subject text,
  status text DEFAULT 'pending',
  ab_winner boolean,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recovery_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to recovery_messages" ON public.recovery_messages FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.nuvemshop_abandoned_checkouts 
  ADD COLUMN IF NOT EXISTS recovery_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS recovery_flow_id uuid,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz;

CREATE TRIGGER update_recovery_flows_updated_at BEFORE UPDATE ON public.recovery_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_recovery_executions_updated_at BEFORE UPDATE ON public.recovery_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.recovery_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recovery_messages;