
-- Drop all "Allow all access" policies
DROP POLICY IF EXISTS "Allow all access to automation_executions" ON public.automation_executions;
DROP POLICY IF EXISTS "Allow all access to automation_flows" ON public.automation_flows;
DROP POLICY IF EXISTS "Allow all access to bot_settings" ON public.bot_settings;
DROP POLICY IF EXISTS "Allow all access to campaign_messages" ON public.campaign_messages;
DROP POLICY IF EXISTS "Allow all access to campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow all access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow all access to conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow all access to custom_tabs" ON public.custom_tabs;
DROP POLICY IF EXISTS "Allow all access to customer_clusters" ON public.customer_clusters;
DROP POLICY IF EXISTS "Allow all access to email_campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Allow all access to email_queue" ON public.email_queue;
DROP POLICY IF EXISTS "Allow all access to email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Allow all access to email_unsubscribes" ON public.email_unsubscribes;
DROP POLICY IF EXISTS "Allow all access to import_batches" ON public.import_batches;
DROP POLICY IF EXISTS "Allow all access to imported_customers" ON public.imported_customers;
DROP POLICY IF EXISTS "Allow all access to messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all access to nuvemshop_abandoned_checkouts" ON public.nuvemshop_abandoned_checkouts;
DROP POLICY IF EXISTS "Allow all access to nuvemshop_orders" ON public.nuvemshop_orders;
DROP POLICY IF EXISTS "Allow all access to quick_responses" ON public.quick_responses;
DROP POLICY IF EXISTS "Allow all access to recovery_executions" ON public.recovery_executions;
DROP POLICY IF EXISTS "Allow all access to recovery_flows" ON public.recovery_flows;
DROP POLICY IF EXISTS "Allow all access to recovery_messages" ON public.recovery_messages;
DROP POLICY IF EXISTS "Allow all access to send_logs" ON public.send_logs;
DROP POLICY IF EXISTS "Allow all access to todos" ON public.todos;
DROP POLICY IF EXISTS "Allow all access to whatsapp_queue" ON public.whatsapp_queue;

-- Drop old profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create authenticated-only policies for all tables
CREATE POLICY "Authenticated full access to automation_executions" ON public.automation_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to automation_flows" ON public.automation_flows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to bot_settings" ON public.bot_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to campaign_messages" ON public.campaign_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to campaigns" ON public.campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to contacts" ON public.contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to conversations" ON public.conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to custom_tabs" ON public.custom_tabs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to customer_clusters" ON public.customer_clusters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to email_campaigns" ON public.email_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to email_queue" ON public.email_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to email_templates" ON public.email_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to email_unsubscribes" ON public.email_unsubscribes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can insert email_unsubscribes" ON public.email_unsubscribes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can read email_unsubscribes" ON public.email_unsubscribes FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated full access to import_batches" ON public.import_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to imported_customers" ON public.imported_customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to messages" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to nuvemshop_abandoned_checkouts" ON public.nuvemshop_abandoned_checkouts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to nuvemshop_orders" ON public.nuvemshop_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to quick_responses" ON public.quick_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to recovery_executions" ON public.recovery_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to recovery_flows" ON public.recovery_flows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to recovery_messages" ON public.recovery_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to send_logs" ON public.send_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to todos" ON public.todos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access to whatsapp_queue" ON public.whatsapp_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profiles: scoped to own user
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
