-- Tabela de integrações Meta (Facebook + Instagram)
CREATE TABLE public.meta_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  facebook_user_id TEXT,
  facebook_user_name TEXT,
  page_id TEXT NOT NULL,
  page_name TEXT,
  page_access_token TEXT NOT NULL,
  instagram_business_account_id TEXT,
  instagram_username TEXT,
  scopes TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  webhook_subscribed BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_id)
);

ALTER TABLE public.meta_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner access meta_integrations"
  ON public.meta_integrations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_meta_integrations_user_id
  BEFORE INSERT ON public.meta_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER update_meta_integrations_updated_at
  BEFORE UPDATE ON public.meta_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Log bruto de webhooks recebidos
CREATE TABLE public.meta_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  object_type TEXT,
  event_type TEXT,
  page_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read meta_webhook_events"
  ON public.meta_webhook_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service insert meta_webhook_events"
  ON public.meta_webhook_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX idx_meta_webhook_events_user_created ON public.meta_webhook_events(user_id, created_at DESC);

-- Comentários do Instagram
CREATE TABLE public.meta_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  integration_id UUID,
  comment_id TEXT NOT NULL,
  parent_comment_id TEXT,
  media_id TEXT,
  media_url TEXT,
  media_caption TEXT,
  author_id TEXT,
  author_username TEXT,
  text TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  sentiment TEXT,
  replied_at TIMESTAMPTZ,
  reply_text TEXT,
  hidden BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

ALTER TABLE public.meta_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner access meta_comments"
  ON public.meta_comments FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_meta_comments_user_id
  BEFORE INSERT ON public.meta_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER update_meta_comments_updated_at
  BEFORE UPDATE ON public.meta_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_meta_comments_user_status ON public.meta_comments(user_id, status, received_at DESC);

-- Estados temporários OAuth
CREATE TABLE public.meta_oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  state TEXT NOT NULL UNIQUE,
  redirect_uri TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner access meta_oauth_states"
  ON public.meta_oauth_states FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_meta_oauth_states_state ON public.meta_oauth_states(state);