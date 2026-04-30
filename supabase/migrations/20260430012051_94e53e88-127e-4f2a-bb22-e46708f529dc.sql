CREATE TABLE IF NOT EXISTS public.instagram_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  external_comment_id TEXT NOT NULL,
  media_id TEXT,
  media_permalink TEXT,
  parent_comment_id TEXT,
  author_id TEXT,
  author_username TEXT,
  text TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  reply_text TEXT,
  replied_at TIMESTAMPTZ,
  hidden BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'instagram',
  comment_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, external_comment_id)
);

ALTER TABLE public.instagram_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own comments" ON public.instagram_comments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own comments" ON public.instagram_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comments" ON public.instagram_comments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.instagram_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ig_comments_user ON public.instagram_comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ig_comments_status ON public.instagram_comments(user_id, status);

CREATE TRIGGER trg_ig_comments_set_user
  BEFORE INSERT ON public.instagram_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER trg_ig_comments_updated
  BEFORE UPDATE ON public.instagram_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();