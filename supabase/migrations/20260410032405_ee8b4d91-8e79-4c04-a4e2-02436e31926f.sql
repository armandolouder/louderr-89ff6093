-- Remove old broad policies that don't check ownership
DROP POLICY IF EXISTS "Authenticated can read whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload whatsapp-media" ON storage.objects;

-- Also remove any other broad pattern variations
DROP POLICY IF EXISTS "authenticated_read_whatsapp_media" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload_whatsapp_media" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_whatsapp_media" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_whatsapp_media" ON storage.objects;