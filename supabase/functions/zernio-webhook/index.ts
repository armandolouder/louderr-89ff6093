import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zernio-signature, x-webhook-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("ZERNIO_WEBHOOK_SECRET"); // optional shared secret

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pick<T = any>(obj: any, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = k.split(".").reduce((o: any, p) => (o == null ? o : o[p]), obj);
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

async function resolveOwner(accountId?: string): Promise<string | null> {
  if (accountId) {
    const { data } = await supabase
      .from("zernio_accounts")
      .select("user_id")
      .eq("account_id", accountId)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }
  const { data: anyAcc } = await supabase
    .from("zernio_accounts")
    .select("user_id")
    .limit(1)
    .maybeSingle();
  if (anyAcc?.user_id) return anyAcc.user_id as string;
  const { data: owner } = await supabase.rpc("get_webhook_owner_user_id");
  return (owner as string | null) ?? null;
}

async function handleMessage(event: string, payload: any) {
  const data = payload?.data ?? payload;

  const conversationId =
    pick<string>(data, "conversationId", "conversation.id", "conversationID", "threadId");
  const accountId = pick<string>(data, "accountId", "account.id", "accountID");
  const platform = (pick<string>(data, "platform", "conversation.platform") ?? "instagram").toLowerCase();

  if (!conversationId) {
    console.warn("[zernio-webhook] missing conversationId", JSON.stringify(data).slice(0, 500));
    return;
  }

  const userId = await resolveOwner(accountId);
  if (!userId) {
    console.warn("[zernio-webhook] could not resolve owner");
    return;
  }

  const isReceived = event === "message.received";
  // sender info (incoming message)
  const senderId =
    pick<string>(data, "sender.id", "from.id", "participantId", "message.sender.id", "senderId");
  const senderName =
    pick<string>(data, "sender.name", "sender.username", "from.name", "participantName", "message.sender.name") ||
    "Instagram";
  const senderPicture = pick<string>(data, "sender.picture", "sender.profilePicture", "participantPicture");

  const text =
    pick<string>(data, "text", "message", "message.text", "content") ?? "";
  const attachments = pick<any[]>(data, "attachments", "message.attachments") ?? [];
  const firstAtt = attachments[0];
  const mediaUrl = firstAtt ? (firstAtt.url ?? firstAtt.payload?.url ?? null) : null;
  const mediaType = firstAtt ? (firstAtt.type ?? "image") : null;
  const platformMessageId = pick<string>(data, "id", "messageId", "message.id", "platformMessageId");

  // 1. contact (use instagram_id to match)
  let contactId: string | undefined;
  if (senderId) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", userId)
      .eq("instagram_id", senderId)
      .limit(1)
      .maybeSingle();
    contactId = existing?.id;
  }
  if (!contactId) {
    const { data: newContact } = await supabase
      .from("contacts")
      .insert({ name: senderName, instagram_id: senderId ?? null, avatar_url: senderPicture ?? null, user_id: userId })
      .select("id")
      .single();
    contactId = newContact?.id;
  }
  if (!contactId) return;

  // 2. conversation (match by external_conversation_id)
  let convId: string | undefined;
  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("external_conversation_id", conversationId)
    .limit(1)
    .maybeSingle();
  convId = existingConv?.id;
  if (!convId) {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        contact_id: contactId,
        channel: "instagram",
        status: "novo",
        external_conversation_id: conversationId,
        external_account_id: accountId ?? null,
        last_message: text || (mediaUrl ? "[mídia]" : ""),
        last_message_at: new Date().toISOString(),
        unread_count: isReceived ? 1 : 0,
        user_id: userId,
      })
      .select("id")
      .single();
    convId = newConv?.id;
  }
  if (!convId) return;

  // 3. dedupe by platform message id
  if (platformMessageId) {
    const { data: dupe } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", convId)
      .contains("metadata", { zernio_message_id: platformMessageId })
      .limit(1)
      .maybeSingle();
    if (dupe?.id) return;
  }

  // 4. insert message
  await supabase.from("messages").insert({
    conversation_id: convId,
    content: text,
    sender_type: isReceived ? "contact" : "agent",
    message_type: mediaUrl ? mediaType : "text",
    media_url: mediaUrl,
    status: isReceived ? "received" : "sent",
    user_id: userId,
    metadata: { provider: "zernio", platform, zernio_message_id: platformMessageId, event },
  });

  // 5. update conversation
  const update: Record<string, unknown> = {
    last_message: text || (mediaUrl ? "[mídia]" : ""),
    last_message_at: new Date().toISOString(),
  };
  if (isReceived) {
    const { data: cur } = await supabase.from("conversations").select("unread_count").eq("id", convId).maybeSingle();
    update.unread_count = (cur?.unread_count ?? 0) + 1;
  }
  await supabase.from("conversations").update(update).eq("id", convId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Verification / health check
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("challenge") ?? url.searchParams.get("hub.challenge");
    if (challenge) return new Response(challenge, { headers: corsHeaders });
    return json(200, { ok: true });
  }

  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    if (WEBHOOK_SECRET) {
      const sig = req.headers.get("x-zernio-signature") || req.headers.get("x-webhook-signature");
      if (sig && sig !== WEBHOOK_SECRET) {
        return json(401, { error: "Invalid signature" });
      }
    }

    const payload = await req.json().catch(() => ({}));
    const event = (payload?.event ?? payload?.type ?? "").toString();

    if (event === "message.received" || event === "message.sent") {
      await handleMessage(event, payload);
    } else if (event === "message.read") {
      // best-effort: nothing critical to store
      console.log("[zernio-webhook] message.read");
    } else {
      console.log("[zernio-webhook] ignored event:", event);
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error("[zernio-webhook] error", err);
    return json(200, { ok: true }); // never retry-storm
  }
});