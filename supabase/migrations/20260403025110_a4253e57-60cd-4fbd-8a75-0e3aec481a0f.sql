
-- Email Templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  preview_text TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  category TEXT DEFAULT 'geral',
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to email_templates" ON public.email_templates FOR ALL TO public USING (true) WITH CHECK (true);

-- Email Campaigns table
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_id UUID REFERENCES public.email_templates(id),
  cluster_ids UUID[] DEFAULT '{}'::uuid[],
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 250,
  subject_override TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to email_campaigns" ON public.email_campaigns FOR ALL TO public USING (true) WITH CHECK (true);

-- Email Queue table
CREATE TABLE public.email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.email_campaigns(id),
  customer_id UUID REFERENCES public.imported_customers(id),
  email TEXT NOT NULL,
  customer_name TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  brevo_message_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to email_queue" ON public.email_queue FOR ALL TO public USING (true) WITH CHECK (true);

-- Email Unsubscribes table (LGPD compliance)
CREATE TABLE public.email_unsubscribes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to email_unsubscribes" ON public.email_unsubscribes FOR ALL TO public USING (true) WITH CHECK (true);
