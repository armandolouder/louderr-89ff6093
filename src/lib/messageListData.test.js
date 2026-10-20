import { describe, expect, test } from "bun:test";
import { restoreMessageMetadata } from "./messageListData";

describe("message list metadata projection", () => {
  test("retains reactions and cached audio transcription alongside message fields", () => {
    const reactions = [{ emoji: "👍", sent_at: "2026-10-20T12:00:00Z" }];
    const row = restoreMessageMetadata({
      id: "audio-1", media_url: "whatsapp-media:user/audio.ogg",
      evolution_message_id: "provider-id", metadata_reactions: reactions,
      metadata_transcription: "Olá, recebi meu pedido.",
    });
    expect(row).toEqual({
      id: "audio-1", media_url: "whatsapp-media:user/audio.ogg",
      evolution_message_id: "provider-id",
      metadata: { reactions, transcription: "Olá, recebi meu pedido." },
    });
  });
  test("normalizes null presentation metadata without inventing values", () => {
    expect(restoreMessageMetadata({ id: "text-1", metadata_reactions: null, metadata_transcription: null }))
      .toEqual({ id: "text-1", metadata: {} });
  });
});