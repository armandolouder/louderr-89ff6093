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
  if (!mediaRef) return null;
  if (mediaRef.startsWith("http")) return mediaRef;
  const m = mediaRef.match(/^([a-z0-9-]+):(.+)$/i);
  if (!m) return null;
  const { data } = await admin.storage.from(m[1]).createSignedUrl(m[2], 60 * 60);
  return data?.signedUrl ?? null;
}

function inferAttachmentType(messageType: string): "image" | "video" | "audio" | "file" {
  if (messageType === "image") return "image";
  if (messageType === "video") return "video";
  if (messageType === "audio") return "audio";
  return "file";
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

    // Load conversation
    const { data: conv } = await admin
      .from("conversations")
      .select("id, user_id, channel, external_conversation_id, external_account_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) return json(404, { success: false, error: "Conversa não encontrada" });
    if (conv.user_id !== userId) return json(403, { success: false, error: "Sem permissão" });
    if (!conv.external_conversation_id) {
      return json(400, { success: false, error: "Conversa sem identificador Zernio" });
    }

    // Resolve account id
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

    // Build payload
    const payload: Record<string, unknown> = { accountId };
    if (content) payload.message = content;
    if (messageType !== "text" && mediaUrl) {
      const signed = await signedMediaUrl(mediaUrl);
      if (!signed) return json(400, { success: false, error: "Falha ao gerar URL de mídia" });
      payload.attachmentUrl = signed;
      payload.attachmentType = inferAttachmentType(messageType);
    }

    const resp = await fetch(
      `${ZERNIO_BASE}/inbox/conversations/${encodeURIComponent(conv.external_conversation_id)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ZERNIO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    const respText = await resp.text();
    let respData: any = null;
    try { respData = respText ? JSON.parse(respText) : null; } catch { respData = respText; }

    if (!resp.ok) {
      console.error("[zernio-send] failed", resp.status, respText);
      return json(502, { success: false, error: `Falha ao enviar (${resp.status})`, details: respData });
    }

    const platformMessageId =
      respData?.id ?? respData?.messageId ?? respData?.data?.id ?? null;

    // Store outgoing message
    const { data: inserted } = await admin
      .from("messages")
      .insert({
        conversation_id: conv.id,
        content: content ?? "",
        sender_type: "agent",
        message_type: messageType,
        media_url: mediaUrl ?? null,
        status: "sent",
        user_id: userId,
        metadata: { provider: "zernio", zernio_message_id: platformMessageId, event: "message.sent" },
      })
      .select("id")
      .single();

    await admin
      .from("conversations")
      .update({
        last_message: content || "[mídia]",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conv.id);

    return json(200, { success: true, messageId: inserted?.id, platformMessageId });
  } catch (err) {
    console.error("[zernio-send] error", err);
    return json(500, { success: false, error: "Erro de conexão" });
  }
});