
-- Add missing columns to automation_flows
ALTER TABLE public.automation_flows ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive';
ALTER TABLE public.automation_flows ADD COLUMN IF NOT EXISTS delay_value INTEGER DEFAULT 0;
ALTER TABLE public.automation_flows ADD COLUMN IF NOT EXISTS delay_unit TEXT DEFAULT 'minutes';
ALTER TABLE public.automation_flows ADD COLUMN IF NOT EXISTS message_content TEXT;
ALTER TABLE public.automation_flows ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.automation_flows ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE public.automation_flows ADD COLUMN IF NOT EXISTS target_phone TEXT;

-- Add missing columns to nuvemshop_abandoned_checkouts
ALTER TABLE public.nuvemshop_abandoned_checkouts ADD COLUMN IF NOT EXISTS recovery_url TEXT;

-- Add missing columns to nuvemshop_orders
ALTER TABLE public.nuvemshop_orders ADD COLUMN IF NOT EXISTS shipping_status TEXT;
