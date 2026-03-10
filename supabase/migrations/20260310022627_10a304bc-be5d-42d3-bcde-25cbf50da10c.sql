
-- ===== CONTACTS =====
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  instagram_id TEXT,
  avatar_url TEXT,
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_email ON public.contacts(email);

-- ===== CUSTOM_TABS =====
CREATE TABLE public.custom_tabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'folder',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===== CONVERSATIONS =====
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'novo',
  assignee_id UUID,
  assignee_name TEXT,
  unread_count INTEGER DEFAULT 0,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  tab_id UUID REFERENCES public.custom_tabs(id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_tab ON public.conversations(tab_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- ===== MESSAGES =====
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  sender_id UUID,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);

-- ===== QUICK_RESPONSES =====
CREATE TABLE public.quick_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  shortcut TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===== CUSTOMER_CLUSTERS =====
CREATE TABLE public.customer_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  objective TEXT,
  recommendation TEXT,
  color TEXT DEFAULT '#6366f1',
  criteria JSONB DEFAULT '{}'::jsonb,
  customer_count INTEGER DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===== IMPORT_BATCHES =====
CREATE TABLE public.import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  status TEXT DEFAULT 'processing',
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  invalid_rows INTEGER DEFAULT 0,
  valid_phones INTEGER DEFAULT 0,
  invalid_phones INTEGER DEFAULT 0,
  absent_phones INTEGER DEFAULT 0,
  valid_emails INTEGER DEFAULT 0,
  invalid_emails INTEGER DEFAULT 0,
  absent_emails INTEGER DEFAULT 0,
  column_mapping JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===== IMPORTED_CUSTOMERS =====
CREATE TABLE public.imported_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
  cluster_id UUID REFERENCES public.customer_clusters(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  phone_status TEXT DEFAULT 'pending',
  email TEXT,
  email_status TEXT DEFAULT 'pending',
  city TEXT,
  state TEXT,
  region TEXT,
  favorite_product TEXT,
  favorite_category TEXT,
  source TEXT,
  total_spent NUMERIC DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  first_purchase_at TIMESTAMP WITH TIME ZONE,
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  rfm_recency INTEGER,
  rfm_frequency INTEGER,
  rfm_monetary INTEGER,
  rfm_score TEXT,
  ticket_level TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_imported_customers_cluster ON public.imported_customers(cluster_id);
CREATE INDEX idx_imported_customers_batch ON public.imported_customers(import_batch_id);
CREATE INDEX idx_imported_customers_phone ON public.imported_customers(phone);

-- ===== CAMPAIGNS =====
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'draft',
  cluster_ids UUID[] DEFAULT '{}'::uuid[],
  daily_limit INTEGER DEFAULT 50,
  delay_min_seconds INTEGER DEFAULT 180,
  delay_max_seconds INTEGER DEFAULT 480,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===== CAMPAIGN_MESSAGES =====
CREATE TABLE public.campaign_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaign_messages_campaign ON public.campaign_messages(campaign_id);

-- ===== WHATSAPP_QUEUE =====
CREATE TABLE public.whatsapp_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.imported_customers(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.campaign_messages(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_queue_campaign ON public.whatsapp_queue(campaign_id);
CREATE INDEX idx_whatsapp_queue_status ON public.whatsapp_queue(status);
CREATE INDEX idx_whatsapp_queue_scheduled ON public.whatsapp_queue(scheduled_at);

-- ===== SEND_LOGS =====
CREATE TABLE public.send_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.imported_customers(id) ON DELETE SET NULL,
  queue_id UUID REFERENCES public.whatsapp_queue(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  content TEXT,
  cluster_name TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  response_data JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_send_logs_campaign ON public.send_logs(campaign_id);
CREATE INDEX idx_send_logs_status ON public.send_logs(status);
CREATE INDEX idx_send_logs_sent ON public.send_logs(sent_at DESC);

-- ===== NUVEMSHOP_ORDERS =====
CREATE TABLE public.nuvemshop_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nuvemshop_order_id TEXT,
  order_number TEXT,
  status TEXT,
  payment_status TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  products JSONB DEFAULT '[]'::jsonb,
  order_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===== NUVEMSHOP_ABANDONED_CHECKOUTS =====
CREATE TABLE public.nuvemshop_abandoned_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nuvemshop_checkout_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  products JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'abandoned',
  contacted_at TIMESTAMP WITH TIME ZONE,
  contact_channel TEXT,
  recovered BOOLEAN DEFAULT false,
  created_at_nuvemshop TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===== AUTOMATION_FLOWS =====
CREATE TABLE public.automation_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT false,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===== AUTOMATION_EXECUTIONS =====
CREATE TABLE public.automation_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  trigger_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===== REALTIME =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ===== RLS POLICIES =====
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.custom_tabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to custom_tabs" ON public.custom_tabs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.quick_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to quick_responses" ON public.quick_responses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.customer_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to customer_clusters" ON public.customer_clusters FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to import_batches" ON public.import_batches FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.imported_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to imported_customers" ON public.imported_customers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to campaign_messages" ON public.campaign_messages FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to whatsapp_queue" ON public.whatsapp_queue FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.send_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to send_logs" ON public.send_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.nuvemshop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to nuvemshop_orders" ON public.nuvemshop_orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.nuvemshop_abandoned_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to nuvemshop_abandoned_checkouts" ON public.nuvemshop_abandoned_checkouts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.automation_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to automation_flows" ON public.automation_flows FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to automation_executions" ON public.automation_executions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (true);

-- ===== FUNCTIONS & TRIGGERS =====
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_custom_tabs_updated_at BEFORE UPDATE ON public.custom_tabs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_quick_responses_updated_at BEFORE UPDATE ON public.quick_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_customer_clusters_updated_at BEFORE UPDATE ON public.customer_clusters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_imported_customers_updated_at BEFORE UPDATE ON public.imported_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
