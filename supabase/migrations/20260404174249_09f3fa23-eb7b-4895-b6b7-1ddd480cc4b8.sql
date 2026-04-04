
-- Add user_id to all operational tables (profiles already has it)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_messages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.send_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.imported_customers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.import_batches ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.customer_clusters ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.automation_flows ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.custom_tabs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.quick_responses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.nuvemshop_orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.nuvemshop_abandoned_checkouts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recovery_flows ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recovery_executions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recovery_messages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop all old permissive policies
DROP POLICY IF EXISTS "Authenticated full access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated full access to conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated full access to messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated full access to campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated full access to campaign_messages" ON public.campaign_messages;
DROP POLICY IF EXISTS "Authenticated full access to whatsapp_queue" ON public.whatsapp_queue;
DROP POLICY IF EXISTS "Authenticated full access to send_logs" ON public.send_logs;
DROP POLICY IF EXISTS "Authenticated full access to imported_customers" ON public.imported_customers;
DROP POLICY IF EXISTS "Authenticated full access to import_batches" ON public.import_batches;
DROP POLICY IF EXISTS "Authenticated full access to customer_clusters" ON public.customer_clusters;
DROP POLICY IF EXISTS "Authenticated full access to automation_flows" ON public.automation_flows;
DROP POLICY IF EXISTS "Authenticated full access to automation_executions" ON public.automation_executions;
DROP POLICY IF EXISTS "Authenticated full access to bot_settings" ON public.bot_settings;
DROP POLICY IF EXISTS "Authenticated full access to custom_tabs" ON public.custom_tabs;
DROP POLICY IF EXISTS "Authenticated full access to quick_responses" ON public.quick_responses;
DROP POLICY IF EXISTS "Authenticated full access to email_campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Authenticated full access to email_queue" ON public.email_queue;
DROP POLICY IF EXISTS "Authenticated full access to email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Authenticated full access to email_unsubscribes" ON public.email_unsubscribes;
DROP POLICY IF EXISTS "Authenticated full access to nuvemshop_orders" ON public.nuvemshop_orders;
DROP POLICY IF EXISTS "Authenticated full access to nuvemshop_abandoned_checkouts" ON public.nuvemshop_abandoned_checkouts;
DROP POLICY IF EXISTS "Authenticated full access to recovery_flows" ON public.recovery_flows;
DROP POLICY IF EXISTS "Authenticated full access to recovery_executions" ON public.recovery_executions;
DROP POLICY IF EXISTS "Authenticated full access to recovery_messages" ON public.recovery_messages;
DROP POLICY IF EXISTS "Authenticated full access to todos" ON public.todos;
DROP POLICY IF EXISTS "Public can insert email_unsubscribes" ON public.email_unsubscribes;

-- Create owner-scoped RLS policies for all tables
CREATE POLICY "Owner access contacts" ON public.contacts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access conversations" ON public.conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access messages" ON public.messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access campaigns" ON public.campaigns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access campaign_messages" ON public.campaign_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access whatsapp_queue" ON public.whatsapp_queue FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access send_logs" ON public.send_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access imported_customers" ON public.imported_customers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access import_batches" ON public.import_batches FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access customer_clusters" ON public.customer_clusters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access automation_flows" ON public.automation_flows FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access automation_executions" ON public.automation_executions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access bot_settings" ON public.bot_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access custom_tabs" ON public.custom_tabs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access quick_responses" ON public.quick_responses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access email_campaigns" ON public.email_campaigns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access email_queue" ON public.email_queue FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access email_templates" ON public.email_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access nuvemshop_orders" ON public.nuvemshop_orders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access nuvemshop_abandoned_checkouts" ON public.nuvemshop_abandoned_checkouts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access recovery_flows" ON public.recovery_flows FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access recovery_executions" ON public.recovery_executions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access recovery_messages" ON public.recovery_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner access todos" ON public.todos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- email_unsubscribes: authenticated full + anon insert (for opt-out links)
CREATE POLICY "Owner access email_unsubscribes" ON public.email_unsubscribes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon insert email_unsubscribes" ON public.email_unsubscribes FOR INSERT TO anon WITH CHECK (true);
