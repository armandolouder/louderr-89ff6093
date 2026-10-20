// Fetch only presentation metadata; raw provider payloads remain stored for
// server-side reactions/deduplication but must not travel with each chat page.
export const MESSAGE_LIST_SELECT = "id, conversation_id, content, sender_type, sender_id, message_type, media_url, evolution_message_id, whatsapp_message_id, status, created_at, metadata_reactions:metadata->reactions, metadata_transcription:metadata->>transcription";

export function restoreMessageMetadata<T extends {
  metadata_reactions?: unknown;
  metadata_transcription?: unknown;
}>(row: T) {
  const { metadata_reactions, metadata_transcription, ...message } = row;
  const metadata: Record<string, unknown> = {};
  if (metadata_reactions != null) metadata.reactions = metadata_reactions;
  if (metadata_transcription != null) metadata.transcription = metadata_transcription;
  return { ...message, metadata };
}