import { supabase } from "@/integrations/supabase/client";

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_DURATION = 3600; // 1 hour
const CACHE_BUFFER = 300; // refresh 5 min before expiry

/**
 * Resolves a media URL. If it's a storage path reference (whatsapp-media:path),
 * generates a signed URL. Otherwise returns the URL as-is (legacy public URLs).
 */
export async function resolveMediaUrl(mediaUrl: string | null): Promise<string | null> {
  if (!mediaUrl) return null;

  // Check if it's a storage path reference
  if (!mediaUrl.startsWith("whatsapp-media:")) {
    // Legacy public URL or external URL — return as-is
    return mediaUrl;
  }

  const storagePath = mediaUrl.replace("whatsapp-media:", "");

  // Check cache
  const cached = signedUrlCache.get(storagePath);
  const now = Date.now() / 1000;
  if (cached && cached.expiresAt > now + CACHE_BUFFER) {
    return cached.url;
  }

  // Generate signed URL
  const { data, error } = await supabase.storage
    .from("whatsapp-media")
    .createSignedUrl(storagePath, SIGNED_URL_DURATION);

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL:", error);
    return null;
  }

  signedUrlCache.set(storagePath, {
    url: data.signedUrl,
    expiresAt: now + SIGNED_URL_DURATION,
  });

  return data.signedUrl;
}
