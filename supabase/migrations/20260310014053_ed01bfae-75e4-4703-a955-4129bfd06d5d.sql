
-- Drop all tables with CASCADE to handle foreign keys
DROP TABLE IF EXISTS public.send_logs CASCADE;
DROP TABLE IF EXISTS public.whatsapp_queue CASCADE;
DROP TABLE IF EXISTS public.campaign_messages CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.automation_executions CASCADE;
DROP TABLE IF EXISTS public.automation_flows CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.custom_tabs CASCADE;
DROP TABLE IF EXISTS public.customer_clusters CASCADE;
DROP TABLE IF EXISTS public.imported_customers CASCADE;
DROP TABLE IF EXISTS public.import_batches CASCADE;
DROP TABLE IF EXISTS public.nuvemshop_orders CASCADE;
DROP TABLE IF EXISTS public.nuvemshop_abandoned_checkouts CASCADE;
DROP TABLE IF EXISTS public.quick_responses CASCADE;
DROP TABLE IF EXISTS public.todos CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
