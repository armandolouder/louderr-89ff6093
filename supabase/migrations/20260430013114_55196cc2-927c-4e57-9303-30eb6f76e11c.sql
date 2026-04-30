CREATE UNIQUE INDEX IF NOT EXISTS uniq_meta_comments_user_comment
  ON public.meta_comments (user_id, comment_id);