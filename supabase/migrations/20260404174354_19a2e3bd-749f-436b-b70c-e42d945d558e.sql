
-- Create function to auto-set user_id from JWT
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers on all tables with user_id
CREATE TRIGGER set_user_id_contacts BEFORE INSERT ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_conversations BEFORE INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_messages BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_campaigns BEFORE INSERT ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_campaign_messages BEFORE INSERT ON public.campaign_messages FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_whatsapp_queue BEFORE INSERT ON public.whatsapp_queue FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_send_logs BEFORE INSERT ON public.send_logs FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_imported_customers BEFORE INSERT ON public.imported_customers FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_import_batches BEFORE INSERT ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_customer_clusters BEFORE INSERT ON public.customer_clusters FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_automation_flows BEFORE INSERT ON public.automation_flows FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_automation_executions BEFORE INSERT ON public.automation_executions FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_bot_settings BEFORE INSERT ON public.bot_settings FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_custom_tabs BEFORE INSERT ON public.custom_tabs FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_quick_responses BEFORE INSERT ON public.quick_responses FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_email_campaigns BEFORE INSERT ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_email_queue BEFORE INSERT ON public.email_queue FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_email_templates BEFORE INSERT ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_nuvemshop_orders BEFORE INSERT ON public.nuvemshop_orders FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_nuvemshop_abandoned_checkouts BEFORE INSERT ON public.nuvemshop_abandoned_checkouts FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_recovery_flows BEFORE INSERT ON public.recovery_flows FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_recovery_executions BEFORE INSERT ON public.recovery_executions FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_recovery_messages BEFORE INSERT ON public.recovery_messages FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_todos BEFORE INSERT ON public.todos FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
