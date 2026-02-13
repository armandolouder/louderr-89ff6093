ALTER TABLE public.conversations ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX idx_conversations_is_archived ON public.conversations (is_archived);