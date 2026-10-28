CREATE TABLE public.printbee_tracking_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 order_identifier text NOT NULL,
 tracking_data jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id, order_identifier)
);
GRANT SELECT ON public.printbee_tracking_links TO authenticated;
GRANT ALL ON public.printbee_tracking_links TO service_role;
ALTER TABLE public.printbee_tracking_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own tracking links" ON public.printbee_tracking_links FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);