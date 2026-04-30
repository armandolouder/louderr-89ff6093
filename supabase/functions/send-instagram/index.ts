import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GRAPH = "https://graph.facebook.com/v22.0";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
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

    // 1. Load conversation + contact (must belong to the user)
    const { data: conv, error: convErr } = await admin
      .from("conversations")
      .select("id, user_id, contact_id, channel")
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

    // 2. Load Meta integration for this user (any IG-enabled page)
    const { data: integ, error: integErr } = await admin
      .from("meta_integrations")
      .select("page_id, page_access_token, instagram_business_account_id")
      .eq("user_id", userId)
      .not("instagram_business_account_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (integErr || !integ?.page_access_token) {
      return json(400, {
        success: false,
        error: "Integração Meta/Instagram não configurada",
      });
    }

    // 3. Try take_thread_control BEFORE sending (Instagram via Facebook Login uses Handover Protocol)
    //    If the Meta Inbox is the Primary Receiver, we must request control first.
    const takeUrl = `${GRAPH}/me/take_thread_control?access_token=${integ.page_access_token}`;
    try {
      const takeResp = await fetch(takeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: contact.instagram_id } }),
      });
      const takeText = await takeResp.text();
      let takeJson: any = {};
      try { takeJson = JSON.parse(takeText); } catch { /* not json */ }

      if (!takeResp.ok) {
        const code = takeJson?.error?.code;
        const subcode = takeJson?.error?.error_subcode;
        // 2018112 = "App is already the primary receiver" -> ok, proceed
        if (subcode === 2018112) {
          console.log("[send-instagram] already primary receiver, proceeding");
        } else if (code === 27) {
          // Meta Business has not granted handover permission to this app
          return json(200, {
            success: false,
            error: "Configuração pendente na Meta Business: vá em Meta Business Suite → Configurações da Página → Permissões avançadas de mensagens → Aplicativos conectados, e habilite este app com a permissão 'Controle de conversa' (messaging_handover). Sem isso, a Meta Inbox bloqueia o envio pela API.",
            meta: takeJson,
            requires_business_config: true,
          });
        } else if (code === 10 || code === 200) {
          return json(200, {
            success: false,
            error: "Sem permissão da Meta para tomar controle do thread. Verifique escopo messaging_handover no token.",
            meta: takeJson,
          });
        } else {
          // log warning but try to send anyway (e.g. handover protocol not enabled at all)
          console.warn("[send-instagram] take_thread_control non-fatal", takeResp.status, takeText);
        }
      } else {
        console.log("[send-instagram] thread control acquired");
      }
    } catch (e) {
      console.warn("[send-instagram] take_thread_control exception", e);
    }

    // 4. Build Graph API payload (use /me/messages with page access token, RESPONSE type for 24h window)
    const messagePayload: Record<string, unknown> = {
      recipient: { id: contact.instagram_id },
      messaging_type: "RESPONSE",
    };

    if (messageType === "text") {
      messagePayload.message = { text: content };
    } else {
      const url = await signedMediaUrl(String(mediaUrl ?? ""));
      if (!url) return json(400, { success: false, error: "mediaUrl inválido" });
      messagePayload.message = {
        attachment: {
          type: inferAttachmentType(messageType),
          payload: { url, is_reusable: true },
        },
      };
    }

    // Use /me/messages with PAGE access token (correct endpoint for Instagram via Facebook Login)
    const sendUrl = `${GRAPH}/me/messages?access_token=${integ.page_access_token}`;

    const resp = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messagePayload),
    });
    const respText = await resp.text();
    let respJson: any = {};
    try { respJson = JSON.parse(respText); } catch { /* not json */ }

    if (!resp.ok) {
      console.error("[send-instagram] Graph error", resp.status, respText);
      const metaErr = respJson?.error;
      const subcode = metaErr?.error_subcode;
      let friendly = metaErr?.message || `Erro Meta ${resp.status}`;
      let requires_handover_setup = false;
      if (subcode === 2534037 || /not.*owner.*thread|n[ãa]o.*dona/i.test(metaErr?.message ?? "")) {
        friendly = "Este app não tem controle do thread. Configure no Meta Business Suite: Página → Permissões avançadas de mensagens → habilite este app com 'Controle de conversa'.";
        requires_handover_setup = true;
      } else if (metaErr?.code === 27) {
        friendly = "A Meta Business ainda não autorizou este app no Handover Protocol. Configure em Meta Business Suite → Página → Permissões avançadas de mensagens.";
        requires_handover_setup = true;
      } else if (metaErr?.code === 3) {
        friendly = "App Meta sem capability para enviar DMs. Vá em developers.facebook.com → seu app → Casos de uso → adicione 'Instagram messaging'.";
      } else if (metaErr?.code === 10 || metaErr?.code === 200) {
        friendly = "Sem permissão da Meta para enviar essa mensagem (verifique permissões do app/página).";
      } else if (metaErr?.code === 551 || /outside.*window/i.test(metaErr?.message ?? "")) {
        friendly = "Janela de 24h expirada. O Instagram só permite responder em até 24h após a última mensagem do cliente.";
      }
      return json(200, { success: false, error: friendly, meta: respJson, requires_handover_setup });
    }

    // 4. Persist outgoing message locally
    const externalId = respJson?.message_id ?? null;
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
        metadata: externalId ? { external_id: externalId, channel: "instagram" } : { channel: "instagram" },
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

    return json(200, { success: true, message: saved, external_id: externalId });
  } catch (err) {
    console.error("[send-instagram] error", err);
    return json(200, { success: false, error: String(err?.message ?? err) });
  }
});