WITH ranked AS (
  SELECT id, contact_id,
    row_number() OVER (PARTITION BY contact_id ORDER BY last_message_at DESC NULLS LAST, created_at DESC) AS rn,
    first_value(id) OVER (PARTITION BY contact_id ORDER BY last_message_at DESC NULLS LAST, created_at DESC) AS keeper_id
  FROM conversations
  WHERE channel='instagram'
    AND contact_id IN (
      SELECT contact_id FROM conversations WHERE channel='instagram' GROUP BY contact_id HAVING count(*)>1
    )
),
losers AS (
  SELECT id, keeper_id FROM ranked WHERE rn > 1
)
UPDATE messages m
SET conversation_id = l.keeper_id
FROM losers l
WHERE m.conversation_id = l.id;

DELETE FROM conversations c
USING (
  SELECT id FROM (
    SELECT id,
      row_number() OVER (PARTITION BY contact_id ORDER BY last_message_at DESC NULLS LAST, created_at DESC) AS rn
    FROM conversations
    WHERE channel='instagram'
      AND contact_id IN (
        SELECT contact_id FROM conversations WHERE channel='instagram' GROUP BY contact_id HAVING count(*)>1
      )
  ) x WHERE rn > 1
) dups
WHERE c.id = dups.id;