CREATE TABLE public.meta_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  app_id TEXT,
  app_secret TEXT,
  webhook_verify_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner access meta_credentials"
  ON public.meta_credentials FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_meta_credentials_user_id
  BEFORE INSERT ON public.meta_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER update_meta_credentials_updated_at
  BEFORE UPDATE ON public.meta_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();