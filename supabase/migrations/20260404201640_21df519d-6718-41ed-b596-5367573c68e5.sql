-- Fix storage policies: "Service role" policies are on {public} role, allowing unauthenticated write/delete
DROP POLICY IF EXISTS "Service role can delete from whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload to whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for whatsapp-media" ON storage.objects;