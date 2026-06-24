import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY");
const ZERNIO_BASE = "https://zernio.com/api/v1";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAuthUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await userClient.auth.getUser();
  return data.user?.id ?? null;
}

async function signedMediaUrl(mediaRef: string): Promise<string | null> {
  // mediaRef format: "whatsapp-media:<path>" or already a URL
  if (!mediaRef) return null;
  if (mediaRef.startsWith("http")) return mediaRef;
  const m = mediaRef.match(/^([a-z0-9-]+):(.+)$/i);
  if (!m) return null;
  const bucket = m[1];
  const path = m[2];
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

function inferAttachmentType(messageType: string): "image" | "video" | "audio" | "file" {
  if (messageType === "image") return "image";
  if (messageType === "video") return "video";
  if (messageType === "audio") return "audio";
  return "file";
}

async function zernioFetch(path: string, init?: RequestInit) {
  const resp = await fetch(`${ZERNIO_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ZERNIO_API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await resp.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: resp.ok, status: resp.status, data, text };
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    if (!ZERNIO_API_KEY) return json(500, { success: false, error: "ZERNIO_API_KEY não configurada" });

    const userId = await getAuthUserId(req);
    if (!userId) return json(401, { success: false, error: "Não autenticado" });

    const body = await req.json().catch(() => ({}));
    const { conversationId, content, messageType = "text", mediaUrl } = body ?? {};

    if (!conversationId || typeof conversationId !== "string") {
      return json(400, { success: false, error: "conversationId obrigatório" });
    }
    if (messageType === "text" && (!content || typeof content !== "string")) {
      return json(400, { success: false, error: "content obrigatório para texto" });
    }

    const { data: conv, error: convErr } = await admin
      .from("conversations")
      .select("id, user_id, contact_id, channel, external_conversation_id, external_account_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (convErr || !conv) return json(404, { success: false, error: "Conversa não encontrada" });
    if (conv.user_id !== userId) return json(403, { success: false, error: "Sem permissão" });
    if (conv.channel !== "instagram") {
      return json(400, { success: false, error: "Conversa não é do Instagram" });
    }

    const { data: contact, error: contactErr } = await admin
      .from("contacts")
      .select("id, instagram_id, name")
      .eq("id", conv.contact_id)
      .maybeSingle();
    if (contactErr || !contact?.instagram_id) {
      return json(400, { success: false, error: "Contato sem instagram_id" });
    }

    let accountId = conv.external_account_id as string | null;
    if (!accountId) {
      const { data: acc } = await admin
        .from("zernio_accounts")
        .select("account_id")
        .eq("user_id", userId)
        .eq("connected", true)
        .limit(1)
        .maybeSingle();
      accountId = acc?.account_id ?? null;
    }
    if (!accountId) return json(400, { success: false, error: "Nenhuma conta Zernio conectada" });

    let zernioConversationId = conv.external_conversation_id as string | null;
    if (!zernioConversationId) {
      const qs = new URLSearchParams({ platform: "instagram", accountId, limit: "100", sortOrder: "desc" });
      const listResp = await zernioFetch(`/inbox/conversations?${qs.toString()}`);
      if (!listResp.ok) {
        console.error("[send-instagram] zernio list failed", listResp.status, listResp.text);
        return json(502, { success: false, error: "Falha ao localizar conversa na Zernio", details: listResp.data });
      }
      const conversations: any[] = Array.isArray(listResp.data?.data)
        ? listResp.data.data
        : Array.isArray(listResp.data?.conversations)
          ? listResp.data.conversations
          : [];
      const contactInstagramId = normalize(contact.instagram_id);
      const contactName = normalize(contact.name);
      const matched = conversations.find((item) => {
        const participantId = normalize(item.participantId ?? item.participant_id ?? item.senderId ?? item.contactId);
        const participantName = normalize(item.participantName ?? item.participant_name ?? item.name);
        return (contactInstagramId && participantId === contactInstagramId) ||
          (contactName && participantName && participantName === contactName);
      });
      if (!matched?.id) {
        return json(400, {
          success: false,
          error: "Esta conversa antiga ainda não foi vinculada à Zernio. Sincronize os DMs pela Zernio ou aguarde a próxima mensagem do cliente para criar o vínculo novo.",
        });
      }
      zernioConversationId = String(matched.id);
      await admin
        .from("conversations")
        .update({ external_conversation_id: zernioConversationId, external_account_id: accountId, updated_at: new Date().toISOString() })
        .eq("id", conv.id);
    }

    const payload: Record<string, unknown> = { accountId };
    if (content) payload.message = content;
    if (messageType !== "text" && mediaUrl) {
      const signed = await signedMediaUrl(String(mediaUrl ?? ""));
      if (!signed) return json(400, { success: false, error: "mediaUrl inválido" });
      payload.attachmentUrl = signed;
      payload.attachmentType = inferAttachmentType(messageType);
    }

    const sendResp = await zernioFetch(
      `/inbox/conversations/${encodeURIComponent(zernioConversationId)}/messages`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    if (!sendResp.ok) {
      console.error("[send-instagram] zernio send failed", sendResp.status, sendResp.text);
      return json(502, { success: false, error: `Falha ao enviar (${sendResp.status})`, details: sendResp.data });
    }

    const externalId = sendResp.data?.id ?? sendResp.data?.messageId ?? sendResp.data?.data?.id ?? null;
    const nowIso = new Date().toISOString();

    const { data: saved, error: saveErr } = await admin
      .from("messages")
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        sender_type: "agent",
        content: messageType === "text" ? content : (content || `[${messageType}]`),
        message_type: messageType,
        media_url: mediaUrl ?? null,
        status: "sent",
        metadata: { provider: "zernio", zernio_message_id: externalId, event: "message.sent" },
        created_at: nowIso,
      })
      .select()
      .single();

    if (saveErr) {
      console.error("[send-instagram] save error", saveErr);
      return json(200, { success: false, error: "Mensagem enviada, mas falhou ao salvar localmente" });
    }

    await admin
      .from("conversations")
      .update({
        last_message: (messageType === "text" ? content : `[${messageType}]`).slice(0, 200),
        last_message_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", conversationId);

    return json(200, { success: true, message: saved, external_id: externalId, provider: "zernio" });
  } catch (err) {
    console.error("[send-instagram] error", err);
    return json(200, { success: false, error: String(err?.message ?? err) });
  }
});