CREATE TABLE public.zernio_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  account_id text NOT NULL,
  username text,
  profile_id text,
  connected boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zernio_accounts TO authenticated;
GRANT ALL ON public.zernio_accounts TO service_role;

ALTER TABLE public.zernio_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own zernio accounts"
ON public.zernio_accounts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_zernio_accounts_updated_at
BEFORE UPDATE ON public.zernio_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS external_conversation_id text,
  ADD COLUMN IF NOT EXISTS external_account_id text;

CREATE INDEX IF NOT EXISTS idx_conversations_external_conversation_id
  ON public.conversations (external_conversation_id);