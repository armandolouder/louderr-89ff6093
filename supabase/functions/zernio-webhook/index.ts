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

// Like pick, but only returns values that are actual strings.
// Prevents storing an entire nested object as the message content
// when a key like "message" holds the full message object.
function pickString(obj: any, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = k.split(".").reduce((o: any, p) => (o == null ? o : o[p]), obj);
    if (typeof v === "string" && v.length > 0) return v;
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
  const senderUsername = pick<string>(data, "sender.username", "from.username", "message.sender.username");
  const rawPicture = pick<string>(
    data,
    "sender.picture",
    "sender.profilePicture",
    "sender.profilePictureUrl",
    "sender.avatarUrl",
    "sender.avatar",
    "participantPicture",
    "message.sender.picture",
  );
  // O Zernio normalmente envia a foto como null. Quando não houver foto direta,
  // construímos a partir do username (mesmo padrão dos contatos já resolvidos).
  const senderPicture =
    rawPicture || (senderUsername ? `https://www.instagram.com/${senderUsername}/media/?size=l` : undefined);

  const text =
    pickString(data, "text", "message.text", "message.body", "body", "content", "message") ?? "";
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
      .select("id, name, avatar_url")
      .eq("user_id", userId)
      .eq("instagram_id", senderId)
      .limit(1)
      .maybeSingle();
    contactId = existing?.id;
    // Atualiza nome/foto de contatos já existentes (ex.: criados antes pelo
    // Meta com nome genérico "LOUDER.ink" e sem avatar).
    if (contactId && isReceived) {
      const hasRealName = senderName && senderName !== "Instagram";
      const currentNameIsGeneric =
        !existing?.name ||
        existing.name === "Instagram" ||
        existing.name === "LOUDER.ink" ||
        existing.name === senderId ||
        existing.name?.startsWith("IG ");
      const updates: Record<string, unknown> = {};
      if (hasRealName && (currentNameIsGeneric || existing?.name !== senderName)) {
        updates.name = senderName;
      }
      if (senderPicture && !existing?.avatar_url) {
        updates.avatar_url = senderPicture;
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from("contacts").update(updates).eq("id", contactId);
      }
    }
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
  // Match por contato (1 conversa por usuário do Instagram). O Zernio pode
  // enviar IDs de conversa diferentes para o mesmo usuário; casar apenas pelo
  // external_conversation_id gerava conversas duplicadas no Inbox.
  const { data: existingByContact } = await supabase
    .from("conversations")
    .select("id, external_conversation_id")
    .eq("user_id", userId)
    .eq("contact_id", contactId)
    .eq("channel", "instagram")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  convId = existingByContact?.id;
  // Garante que o external_conversation_id mais recente fique salvo na conversa.
  if (convId && existingByContact?.external_conversation_id !== conversationId) {
    await supabase
      .from("conversations")
      .update({ external_conversation_id: conversationId })
      .eq("id", convId);
  }
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