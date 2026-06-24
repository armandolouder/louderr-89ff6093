UPDATE messages
SET content = COALESCE(NULLIF((content::jsonb)->>'text', ''), content)
WHERE content LIKE '{"id"%'
  AND metadata->>'provider' = 'zernio'
  AND (content::jsonb ? 'text');

UPDATE conversations c
SET last_message = m.content
FROM (
  SELECT DISTINCT ON (conversation_id) conversation_id, content
  FROM messages
  ORDER BY conversation_id, created_at DESC
) m
WHERE c.id = m.conversation_id
  AND c.last_message LIKE '{"id"%';