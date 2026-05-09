The issue of double messages (a local message followed by a webhook confirmation appearing as a duplicate) is likely caused by a race condition or an incomplete deduplication check. 

I will implement the following changes:

### 1. Database Schema Update
- Add explicit columns `evolution_message_id` and `whatsapp_message_id` to the `messages` table for more reliable deduplication than JSON metadata indexing.
- Update existing messages to move metadata IDs to these new columns.

### 2. Edge Function: send-whatsapp
- Improve the logic that checks for existing messages before inserting.
- Ensure that the local insertion uses the new columns.

### 3. Edge Function: whatsapp-webhook
- Refine the deduplication logic to use the new columns.
- Ensure messages with `fromMe: true` (sent by the system) are correctly identified and either merged or skipped if they already exist.

### 4. Frontend Optimization (hooks/useMessages.ts)
- Add a client-side deduplication logic to the `useMessages` hook as a safety net, ensuring that messages with the same content and near-identical timestamps or identical external IDs aren't displayed twice.

Technical details:
- Migration to add `evolution_message_id` and `whatsapp_message_id` (TEXT, indexed).
- Update `whatsapp-webhook/index.ts` to query these columns.
- Update `send-whatsapp/index.ts` to insert into these columns.
- Update `useMessages.ts` to filter duplicates in the `queryFn`.
