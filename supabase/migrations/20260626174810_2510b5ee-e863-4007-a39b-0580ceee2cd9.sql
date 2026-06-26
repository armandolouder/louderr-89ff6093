CREATE TABLE public.nuvemshop_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  store_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  store_name TEXT,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (store_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nuvemshop_credentials TO authenticated;
GRANT ALL ON public.nuvemshop_credentials TO service_role;
ALTER TABLE public.nuvemshop_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own nuvemshop credentials" ON public.nuvemshop_credentials
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_nuvemshop_credentials_user_id BEFORE INSERT ON public.nuvemshop_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER update_nuvemshop_credentials_updated_at BEFORE UPDATE ON public.nuvemshop_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();