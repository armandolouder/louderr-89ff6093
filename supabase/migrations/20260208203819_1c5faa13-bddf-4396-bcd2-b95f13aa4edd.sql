-- =============================================
-- MÓDULO DE CAMPANHAS - IMPORTAÇÃO E MARKETING
-- =============================================

-- 1. Tabela de clientes importados
CREATE TABLE public.imported_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  phone_status TEXT DEFAULT 'pending' CHECK (phone_status IN ('valid', 'invalid', 'absent', 'pending')),
  email TEXT,
  email_status TEXT DEFAULT 'pending' CHECK (email_status IN ('valid', 'invalid', 'absent', 'pending')),
  city TEXT,
  state TEXT,
  region TEXT,
  total_spent NUMERIC(12,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  first_purchase_at TIMESTAMP WITH TIME ZONE,
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  favorite_product TEXT,
  favorite_category TEXT,
  source TEXT,
  cluster_id UUID,
  rfm_recency INTEGER,
  rfm_frequency INTEGER,
  rfm_monetary INTEGER,
  rfm_score TEXT,
  ticket_level TEXT CHECK (ticket_level IN ('low', 'medium', 'high')),
  metadata JSONB DEFAULT '{}'::jsonb,
  import_batch_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de clusters/segmentos
CREATE TABLE public.customer_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  objective TEXT,
  recommendation TEXT,
  customer_count INTEGER DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  criteria JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela de campanhas
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
  channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'both')),
  cluster_ids UUID[] DEFAULT '{}',
  daily_limit INTEGER DEFAULT 50,
  delay_min_seconds INTEGER DEFAULT 180,
  delay_max_seconds INTEGER DEFAULT 480,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tabela de mensagens/variações de campanha
CREATE TABLE public.campaign_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'document')),
  media_url TEXT,
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Fila de envio WhatsApp
CREATE TABLE public.whatsapp_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.imported_customers(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.campaign_messages(id),
  phone TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'failed', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Logs de envio (auditoria)
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

-- 7. Tabela de lotes de importação
CREATE TABLE public.import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  invalid_rows INTEGER DEFAULT 0,
  valid_phones INTEGER DEFAULT 0,
  invalid_phones INTEGER DEFAULT 0,
  absent_phones INTEGER DEFAULT 0,
  valid_emails INTEGER DEFAULT 0,
  invalid_emails INTEGER DEFAULT 0,
  absent_emails INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  column_mapping JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Adicionar FK para cluster_id na tabela imported_customers
ALTER TABLE public.imported_customers 
ADD CONSTRAINT imported_customers_cluster_id_fkey 
FOREIGN KEY (cluster_id) REFERENCES public.customer_clusters(id) ON DELETE SET NULL;

-- Adicionar FK para import_batch_id
ALTER TABLE public.imported_customers 
ADD CONSTRAINT imported_customers_import_batch_id_fkey 
FOREIGN KEY (import_batch_id) REFERENCES public.import_batches(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX idx_imported_customers_cluster ON public.imported_customers(cluster_id);
CREATE INDEX idx_imported_customers_phone_status ON public.imported_customers(phone_status);
CREATE INDEX idx_imported_customers_email_status ON public.imported_customers(email_status);
CREATE INDEX idx_imported_customers_region ON public.imported_customers(region);
CREATE INDEX idx_imported_customers_rfm_score ON public.imported_customers(rfm_score);
CREATE INDEX idx_whatsapp_queue_status ON public.whatsapp_queue(status);
CREATE INDEX idx_whatsapp_queue_campaign ON public.whatsapp_queue(campaign_id);
CREATE INDEX idx_whatsapp_queue_scheduled ON public.whatsapp_queue(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_send_logs_campaign ON public.send_logs(campaign_id);

-- Enable RLS
ALTER TABLE public.imported_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies (acesso total por enquanto - ajustar com auth depois)
CREATE POLICY "Allow all access to imported_customers" ON public.imported_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to customer_clusters" ON public.customer_clusters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to campaign_messages" ON public.campaign_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to whatsapp_queue" ON public.whatsapp_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to send_logs" ON public.send_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to import_batches" ON public.import_batches FOR ALL USING (true) WITH CHECK (true);

-- Triggers para updated_at
CREATE TRIGGER update_imported_customers_updated_at BEFORE UPDATE ON public.imported_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_customer_clusters_updated_at BEFORE UPDATE ON public.customer_clusters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable Realtime para tabelas principais
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_clusters;