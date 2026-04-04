
-- 1. Fix email_unsubscribes: remove public SELECT, keep anon INSERT for opt-out
DROP POLICY IF EXISTS "Public can read email_unsubscribes" ON public.email_unsubscribes;

-- 2. Fix whatsapp-media storage: restrict to authenticated users
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes" ON storage.objects;

-- Create authenticated-only storage policies for whatsapp-media
CREATE POLICY "Authenticated can read whatsapp-media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Authenticated can upload whatsapp-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "Authenticated can update whatsapp-media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Authenticated can delete whatsapp-media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'whatsapp-media');
