-- Set up storage policies for 'whatsapp-media' bucket
-- Allow public access to read files (if the bucket is public)
-- Or just allow authenticated users if that's the goal.
-- Based on the error, the user is authenticated but doesn't have INSERT permission.

-- Ensure the bucket exists (it already does, but just in case)
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

-- Policy to allow authenticated users to view media
CREATE POLICY "Allow authenticated users to view media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'whatsapp-media');

-- Policy to allow public to view media (since public=true)
CREATE POLICY "Allow public to view media"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'whatsapp-media');

-- Policy to allow authenticated users to update their own media
CREATE POLICY "Allow authenticated users to update media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'whatsapp-media');

-- Policy to allow authenticated users to delete their own media
CREATE POLICY "Allow authenticated users to delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'whatsapp-media');