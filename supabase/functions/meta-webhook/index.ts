import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENV_VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") ?? "louder_meta_verify_2026";
const GRAPH = "https://graph.facebook.com/v22.0";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

type Integration = {
  user_id: string;
  page_id: string;
  page_name: string | null;
  page_access_token: string;
  instagram_business_account_id: string | null;
  instagram_username: string | null;
};

async function findIntegrationByPage(pageId: string): Promise<Integration | null> {
  const { data } = await supabase
    .from("meta_integrations")
    .select("user_id,page_id,page_name,page_access_token,instagram_business_account_id,instagram_username")
    .eq("page_id", pageId)
    .maybeSingle();
  return (data as Integration) ?? null;
}

async function findIntegrationByIgAccount(igId: string): Promise<Integration | null> {
  const { data } = await supabase
    .from("meta_integrations")
    .select("user_id,page_id,page_name,page_access_token,instagram_business_account_id,instagram_username")
    .eq("instagram_business_account_id", igId)
    .maybeSingle();
  return (data as Integration) ?? null;
}

async function listInstagramIntegrations(): Promise<Integration[]> {
  const { data } = await supabase
    .from("meta_integrations")
    .select("user_id,page_id,page_name,page_access_token,instagram_business_account_id,instagram_username")
    .not("instagram_business_account_id", "is", null);

  return (data as Integration[]) ?? [];
}

async function inspectInstagramTarget(entryId: string, integration: Integration): Promise<boolean> {
  try {
    const resp = await fetch(
      `${GRAPH}/${entryId}?fields=id,username&access_token=${integration.page_access_token}`,
    );
    if (!resp.ok) return false;

    const data = await resp.json();
    return String(data?.id ?? "") === entryId;
  } catch (_err) {
    return false;
  }
}

async function resolveIntegration(entry: any, objectType?: string): Promise<Integration | null> {
  const id = String(entry?.id ?? "");
  if (!id) return null;

  let integ = await findIntegrationByIgAccount(id);
  if (integ) return integ;

  integ = await findIntegrationByPage(id);
  if (integ) return integ;

  if (objectType === "instagram") {
    const integrations = await listInstagramIntegrations();

    if (integrations.length === 1) {
      console.warn("[meta-webhook] fallback matched single instagram integration", {
        entryId: id,
        pageId: integrations[0].page_id,
        igId: integrations[0].instagram_business_account_id,
      });
      return integrations[0];
    }

    for (const candidate of integrations) {
      const matches = await inspectInstagramTarget(id, candidate);
      if (matches) {
        console.log("[meta-webhook] resolved instagram entry id via page token", {
          entryId: id,
          pageId: candidate.page_id,
          igId: candidate.instagram_business_account_id,
        });
        return candidate;
      }
    }
  }

  return null;
}

async function upsertContact(
  userId: string,
  opts: {
    instagramId?: string | null;
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  },
): Promise<string | null> {
  if (!opts.instagramId) return null;

  const { data: existing } = await supabase
    .from("contacts")
    .select("id,name,avatar_url")
    .eq("user_id", userId)
    .eq("instagram_id", opts.instagramId)
    .maybeSingle();

  if (existing?.id) {
    const updates: Record<string, unknown> = {};
    const niceName = opts.name || opts.username || null;
    const looksPlaceholder =
      !existing.name ||
      existing.name === opts.instagramId ||
      /^IG\s/i.test(existing.name);
    if (niceName && looksPlaceholder) updates.name = niceName;
    if (opts.avatarUrl && existing.avatar_url !== opts.avatarUrl) updates.avatar_url = opts.avatarUrl;
    if (Object.keys(updates).length > 0) {
      await supabase.from("contacts").update(updates).eq("id", existing.id);
    }
    return existing.id;
  }

  const displayName = opts.name || opts.username || `IG ${opts.instagramId.slice(-6)}`;
  const { data: created } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      instagram_id: opts.instagramId,
      name: displayName,
      avatar_url: opts.avatarUrl ?? null,
    })
    .select("id")
    .single();
  return created?.id ?? null;
}

// Fetch IG user profile (name, username, profile pic) using page access token.
// Uses the Instagram Graph endpoint that works for IG-scoped sender IDs.
async function fetchInstagramProfile(
  igUserId: string,
  pageAccessToken: string,
): Promise<{ name: string | null; username: string | null; avatarUrl: string | null }> {
  try {
    // `username` was deprecated on the IG user profile endpoint (#12 error).
    // Request only `name,profile_pic` — fetching `username` makes the whole call fail.
    const url =
      `${GRAPH}/${igUserId}?fields=name,profile_pic&access_token=${pageAccessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      console.warn("[meta-webhook] IG profile fetch failed", igUserId, res.status, txt);
      // Retry with just profile_pic in case `name` is also restricted for this account
      try {
        const url2 = `${GRAPH}/${igUserId}?fields=profile_pic&access_token=${pageAccessToken}`;
        const r2 = await fetch(url2);
        if (r2.ok) {
          const j2 = await r2.json();
          return { name: null, username: null, avatarUrl: j2.profile_pic ?? null };
        }
      } catch { /* ignore */ }
      return { name: null, username: null, avatarUrl: null };
    }
    const j = await res.json();
    return {
      name: j.name ?? null,
      username: null,
      avatarUrl: j.profile_pic ?? null,
    };
  } catch (e) {
    console.warn("[meta-webhook] IG profile fetch error", igUserId, String(e));
    return { name: null, username: null, avatarUrl: null };
  }
}

async function getOrCreateConversation(
  userId: string,
  contactId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("contact_id", contactId)
    .eq("channel", "instagram")
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      contact_id: contactId,
      channel: "instagram",
      status: "novo",
    })
    .select("id")
    .single();
  return created?.id ?? null;
}

async function saveMessage(params: {
  userId: string;
  conversationId: string;
  senderType: "contact" | "agent";
  content: string;
  messageType?: string;
  mediaUrl?: string | null;
  externalId?: string | null;
  createdAt?: string | null;
}) {
  await supabase.from("messages").insert({
    user_id: params.userId,
    conversation_id: params.conversationId,
    sender_type: params.senderType,
    content: params.content,
    message_type: params.messageType ?? "text",
    media_url: params.mediaUrl ?? null,
    metadata: params.externalId ? { external_id: params.externalId } : {},
    created_at: params.createdAt ?? new Date().toISOString(),
  });

  const updates: Record<string, unknown> = {
    last_message: params.content.slice(0, 200),
    last_message_at: params.createdAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (params.senderType === "contact") {
    // increment unread
    const { data: conv } = await supabase
      .from("conversations")
      .select("unread_count")
      .eq("id", params.conversationId)
      .maybeSingle();
    updates.unread_count = ((conv?.unread_count ?? 0) as number) + 1;
  }
  await supabase.from("conversations").update(updates).eq("id", params.conversationId);
}

// ────────────────────────────────────────────────────────────────────────────
// Instagram DM handler (Messenger-like envelope inside `entry.messaging`)
// ────────────────────────────────────────────────────────────────────────────

async function handleInstagramMessaging(entry: any) {
  // entry.id can be Page ID OR Instagram Business Account ID, depending on subscription
  const id = String(entry.id ?? "");
  const integ = await resolveIntegration(entry, "instagram");
  if (!integ) {
    console.warn("[meta-webhook] no integration for entry.id", id);
    return;
  }

  const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
  for (const evt of messaging) {
    const senderId = evt.sender?.id ? String(evt.sender.id) : null;
    const recipientId = evt.recipient?.id ? String(evt.recipient.id) : null;
    const igBusinessId = integ.instagram_business_account_id;

    // If sender is the business itself → it's an outgoing message (echo)
    const isEcho = !!evt.message?.is_echo || (igBusinessId && senderId === igBusinessId);
    const peerId = isEcho ? recipientId : senderId;
    if (!peerId) continue;

    // Enrich contact with name + avatar from Graph API (only for inbound)
    let profile = { name: null as string | null, username: null as string | null, avatarUrl: null as string | null };
    if (!isEcho && integ.page_access_token) {
      profile = await fetchInstagramProfile(peerId, integ.page_access_token);
    }

    const contactId = await upsertContact(integ.user_id, {
      instagramId: peerId,
      name: profile.name,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
    });
    if (!contactId) continue;
    const conversationId = await getOrCreateConversation(integ.user_id, contactId);
    if (!conversationId) continue;

    const msg = evt.message;
    if (!msg) continue;

    let content = (msg.text as string) ?? "";
    let mediaUrl: string | null = null;
    let messageType = "text";
    if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
      const att = msg.attachments[0];
      messageType = att.type ?? "media";
      mediaUrl = att.payload?.url ?? null;
      if (!content) content = `[${messageType}]`;
    }
    if (!content) content = "[mensagem]";

    await saveMessage({
      userId: integ.user_id,
      conversationId,
      senderType: isEcho ? "agent" : "contact",
      content,
      messageType,
      mediaUrl,
      externalId: msg.mid ?? null,
      createdAt: evt.timestamp ? new Date(evt.timestamp).toISOString() : null,
    });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Instagram comments handler (entry.changes[].field === 'comments')
// ────────────────────────────────────────────────────────────────────────────

async function handleInstagramChange(entry: any) {
  const integ = await resolveIntegration(entry, "instagram");
  if (!integ) return;

  const changes = Array.isArray(entry.changes) ? entry.changes : [];
  for (const change of changes) {
    if (change.field !== "comments" && change.field !== "feed") continue;
    const v = change.value ?? {};

    // Instagram comment shape
    const commentId = String(v.id ?? v.comment_id ?? "");
    if (!commentId) continue;

    const text = v.text ?? v.message ?? null;
    const fromId = v.from?.id ? String(v.from.id) : null;
    const fromName = v.from?.username ?? v.from?.name ?? null;
    const mediaId = v.media?.id ? String(v.media.id) : (v.post_id ? String(v.post_id) : null);
    const parentId = v.parent_id ? String(v.parent_id) : null;

    // Skip our own replies (avoid loop when we post a reply)
    const businessId = integ.instagram_business_account_id;
    if (businessId && fromId === businessId) continue;

    await supabase
      .from("meta_comments")
      .upsert(
        {
          user_id: integ.user_id,
          comment_id: commentId,
          parent_comment_id: parentId,
          media_id: mediaId,
          author_id: fromId,
          author_username: fromName,
          text,
          status: "new",
          received_at: new Date().toISOString(),
          metadata: v,
        },
        { onConflict: "user_id,comment_id" } as any,
      );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Main handler
// ────────────────────────────────────────────────────────────────────────────

// Handover Protocol: request thread control so our app becomes the primary receiver.
// This is needed when Instagram messages arrive under `entry.standby` (Meta's
// default Instagram inbox is the primary receiver and our app is secondary).
async function tryTakeThreadControl(entry: any, standbyEvents: any[]) {
  const integ = await resolveIntegration(entry, "instagram");
  if (!integ?.page_access_token) return;

  const igBusinessId = integ.instagram_business_account_id;
  const seen = new Set<string>();

  for (const evt of standbyEvents) {
    const senderId = evt?.sender?.id ? String(evt.sender.id) : null;
    const recipientId = evt?.recipient?.id ? String(evt.recipient.id) : null;
    const peerId = (igBusinessId && senderId === igBusinessId) ? recipientId : senderId;
    if (!peerId || seen.has(peerId)) continue;
    seen.add(peerId);

    try {
      const resp = await fetch(`${GRAPH}/me/take_thread_control?access_token=${integ.page_access_token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: peerId } }),
      });
      const txt = await resp.text();
      if (!resp.ok) {
        console.warn("[meta-webhook] take_thread_control failed", peerId, resp.status, txt);
      } else {
        console.log("[meta-webhook] take_thread_control OK", peerId);
      }
    } catch (e) {
      console.warn("[meta-webhook] take_thread_control error", peerId, String(e));
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET → Verificação do webhook
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token && challenge) {
      let valid = token === ENV_VERIFY_TOKEN;
      if (!valid) {
        try {
          const { data } = await supabase.rpc("find_meta_user_by_verify_token", { _token: token });
          valid = !!data;
        } catch (e) {
          console.error("[meta-webhook] token lookup failed", e);
        }
      }
      if (valid) {
        console.log("[meta-webhook] verification OK");
        return new Response(challenge, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }
    }
    console.warn("[meta-webhook] verification FAILED", { mode });
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST → Eventos reais
  if (req.method === "POST") {
    try {
      const payload = await req.json();
      const objectType: string = payload?.object ?? "";
      const entries = Array.isArray(payload?.entry) ? payload.entry : [];

      console.log("[meta-webhook] received", objectType, "entries:", entries.length);

      for (const entry of entries) {
        // Always log raw event
        const resolvedIntegration = await resolveIntegration(entry, objectType);
        const userId = resolvedIntegration?.user_id ?? null;

        const eventType =
          (Array.isArray(entry.changes) && entry.changes[0]?.field) ||
          (Array.isArray(entry.messaging) ? "messaging" :
            (Array.isArray(entry.standby) ? "standby" : null));

        await supabase.from("meta_webhook_events").insert({
          user_id: userId,
          object_type: objectType || null,
          event_type: eventType,
          page_id: String(entry.id ?? ""),
          payload: entry,
        });

        try {
          if (Array.isArray(entry.messaging) && entry.messaging.length > 0) {
            await handleInstagramMessaging(entry);
          }
          if (Array.isArray(entry.standby) && entry.standby.length > 0) {
            // Standby = our app is secondary receiver. Save the message anyway
            // so the user sees it in the inbox, then try to take thread control.
            await handleInstagramMessaging({ ...entry, messaging: entry.standby });
            await tryTakeThreadControl(entry, entry.standby);
          }
          if (Array.isArray(entry.changes) && entry.changes.length > 0) {
            await handleInstagramChange(entry);
          }
        } catch (parseErr) {
          console.error("[meta-webhook] parse error", parseErr);
        }
      }

      // Meta exige resposta 200 rápida
      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    } catch (err) {
      console.error("[meta-webhook] error", err);
      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
});
