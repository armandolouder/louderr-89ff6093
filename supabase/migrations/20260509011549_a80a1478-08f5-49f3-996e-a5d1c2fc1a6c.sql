-- Clean up duplicates for whatsapp_message_id
DELETE FROM public.messages a USING public.messages b
WHERE a.id > b.id
AND a.metadata->>'whatsapp_message_id' = b.metadata->>'whatsapp_message_id'
AND a.metadata->>'whatsapp_message_id' IS NOT NULL;

-- Clean up duplicates for evolution_message_id
DELETE FROM public.messages a USING public.messages b
WHERE a.id > b.id
AND a.metadata->>'evolution_message_id' = b.metadata->>'evolution_message_id'
AND a.metadata->>'evolution_message_id' IS NOT NULL;

-- Add unique index for evolution_message_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_evolution_id 
ON public.messages ((metadata->>'evolution_message_id')) 
WHERE (metadata->>'evolution_message_id' IS NOT NULL);

-- Add unique index for whatsapp_message_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_whatsapp_id 
ON public.messages ((metadata->>'whatsapp_message_id')) 
WHERE (metadata->>'whatsapp_message_id' IS NOT NULL);
