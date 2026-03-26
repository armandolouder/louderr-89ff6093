-- First, consolidate duplicate contacts: keep oldest, reassign conversations+messages
DO $$
DECLARE
  dup RECORD;
  canonical_id uuid;
BEGIN
  FOR dup IN
    SELECT phone FROM public.contacts WHERE phone IS NOT NULL GROUP BY phone HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO canonical_id FROM public.contacts WHERE phone = dup.phone ORDER BY created_at ASC LIMIT 1;
    UPDATE public.conversations SET contact_id = canonical_id
    WHERE contact_id IN (SELECT id FROM public.contacts WHERE phone = dup.phone AND id <> canonical_id);
    DELETE FROM public.contacts WHERE phone = dup.phone AND id <> canonical_id;
  END LOOP;
END $$;

-- Consolidate duplicate open conversations per contact+channel
DO $$
DECLARE
  grp RECORD;
  keep_id uuid;
BEGIN
  FOR grp IN
    SELECT contact_id, channel FROM public.conversations 
    WHERE status <> 'finalizado'
    GROUP BY contact_id, channel HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keep_id FROM public.conversations 
    WHERE contact_id = grp.contact_id AND channel = grp.channel AND status <> 'finalizado'
    ORDER BY last_message_at DESC NULLS LAST, created_at DESC LIMIT 1;
    
    UPDATE public.conversations 
    SET status = 'finalizado', is_archived = true
    WHERE contact_id = grp.contact_id AND channel = grp.channel AND id <> keep_id AND status <> 'finalizado';
  END LOOP;
END $$;

-- Add unique index on contacts.phone to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_phone_unique ON public.contacts (phone) WHERE phone IS NOT NULL;