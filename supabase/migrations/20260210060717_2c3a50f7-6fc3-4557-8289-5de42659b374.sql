
-- Table for automation flows
CREATE TABLE public.automation_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  trigger_event TEXT NOT NULL,
  delay_value INTEGER NOT NULL DEFAULT 1,
  delay_unit TEXT NOT NULL DEFAULT 'minutes',
  message_content TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  media_type TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_flows ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can view automation flows"
  ON public.automation_flows FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create automation flows"
  ON public.automation_flows FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update automation flows"
  ON public.automation_flows FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete automation flows"
  ON public.automation_flows FOR DELETE
  TO authenticated USING (true);

-- Allow service role full access (for webhook edge functions)
CREATE POLICY "Service role full access to automation flows"
  ON public.automation_flows FOR ALL
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_automation_flows_updated_at
  BEFORE UPDATE ON public.automation_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Table for scheduled automation executions (post-sale follow-ups, delayed sends)
CREATE TABLE public.automation_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  trigger_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  phone TEXT NOT NULL,
  customer_name TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation executions"
  ON public.automation_executions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage automation executions"
  ON public.automation_executions FOR ALL
  USING (true);

-- Index for pending executions lookup
CREATE INDEX idx_automation_executions_pending 
  ON public.automation_executions(status, scheduled_at) 
  WHERE status = 'pending';

CREATE INDEX idx_automation_flows_trigger 
  ON public.automation_flows(trigger_event, status) 
  WHERE status = 'active';

-- Enable realtime for executions
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_executions;
