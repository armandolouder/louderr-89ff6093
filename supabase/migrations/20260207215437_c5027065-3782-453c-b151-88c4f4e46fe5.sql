-- Create storage bucket for WhatsApp media
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to whatsapp-media bucket
CREATE POLICY "Public read access for whatsapp-media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Allow service role to upload to whatsapp-media
CREATE POLICY "Service role can upload to whatsapp-media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-media');

-- Allow service role to update whatsapp-media
CREATE POLICY "Service role can update whatsapp-media"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'whatsapp-media');

-- Allow service role to delete from whatsapp-media
CREATE POLICY "Service role can delete from whatsapp-media"
ON storage.objects
FOR DELETE
USING (bucket_id = 'whatsapp-media');