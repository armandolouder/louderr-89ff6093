-- Add explicit columns for message IDs
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS evolution_message_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_evolution_id ON public.messages(evolution_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON public.messages(whatsapp_message_id);

-- Backfill data from metadata JSON
UPDATE public.messages
SET 
  evolution_message_id = metadata->> 'evolution_message_id'
WHERE metadata->>'evolution_message_id' IS NOT NULL AND evolution_message_id IS NULL;

UPDATE public.messages
SET 
  whatsapp_message_id = metadata->> 'whatsapp_message_id'
WHERE metadata->>'whatsapp_message_id' IS NOT NULL AND whatsapp_message_id IS NULL;