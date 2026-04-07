
CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  visitor_id text NOT NULL,
  session_id text,
  page_url text NOT NULL,
  page_title text,
  product_id text,
  product_name text,
  product_price numeric,
  product_category text,
  product_image_url text,
  customer_email text,
  customer_phone text,
  customer_name text,
  state text,
  city text,
  country text DEFAULT 'BR',
  device_type text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  duration_seconds integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- The edge function uses service role to insert (public pixel endpoint)
-- Authenticated users can only read their own data
CREATE POLICY "Owner read page_views"
  ON public.page_views
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role inserts (from edge function) bypass RLS
-- No public/anon access at all

CREATE INDEX idx_page_views_user_id ON public.page_views(user_id);
CREATE INDEX idx_page_views_visitor_id ON public.page_views(visitor_id);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_page_views_product_id ON public.page_views(product_id);
