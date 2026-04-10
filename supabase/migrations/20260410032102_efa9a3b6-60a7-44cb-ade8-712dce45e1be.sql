-- 1. Add user_id to email_unsubscribes
ALTER TABLE public.email_unsubscribes ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT NULL;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Anon insert email_unsubscribes" ON public.email_unsubscribes;
DROP POLICY IF EXISTS "Authenticated can insert email_unsubscribes" ON public.email_unsubscribes;
DROP POLICY IF EXISTS "Authenticated can read email_unsubscribes" ON public.email_unsubscribes;

-- Anon can still INSERT (public opt-out links) — no user_id required
CREATE POLICY "Anon insert email_unsubscribes"
ON public.email_unsubscribes FOR INSERT TO anon
WITH CHECK (true);

-- Authenticated can INSERT with their user_id
CREATE POLICY "Authenticated insert email_unsubscribes"
ON public.email_unsubscribes FOR INSERT TO authenticated
WITH CHECK (true);

-- Authenticated can only SELECT their own records
CREATE POLICY "Owner read email_unsubscribes"
ON public.email_unsubscribes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 2. Make whatsapp-media bucket private
UPDATE storage.buckets SET public = false WHERE id = 'whatsapp-media';

-- Drop all existing storage policies for whatsapp-media
DROP POLICY IF EXISTS "Authenticated users can upload whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from whatsapp-media" ON storage.objects;

-- Create ownership-scoped storage policies
-- Files must be stored under: {user_id}/images/..., {user_id}/videos/..., etc.
CREATE POLICY "Owner can read own whatsapp media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'whatsapp-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can upload own whatsapp media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can update own whatsapp media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'whatsapp-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can delete own whatsapp media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'whatsapp-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role needs access for webhook uploads (no policy needed, service role bypasses RLS)