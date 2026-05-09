import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppText, hasWhatsAppCredentials } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, token",
};

interface UazapiMediaContent {
  URL?: string;
  mimetype?: string;
  filename?: string;
  caption?: string;
  text?: string;
  key?: {
    ID?: string;
    id?: string;
    remoteJID?: string;
    fromMe?: boolean;
  };
}

interface UazapiMessage {
  id: string;
  messageid: string;
  chatid: string;
  content: string | UazapiMediaContent;
  text: string;
  fromMe: boolean;
  sender: string;
  senderName: string;
  messageType: string;
  type: string;
  mediaType: string;
  messageTimestamp: number;
  isGroup: boolean;
  wasSentByApi: boolean;
  status: string;
}

interface UazapiChat {
  id: string;
  name: string;
  phone: string;
  wa_chatid: string;
  wa_name: string;
  wa_unreadCount: number;
  imagePreview: string;
}

interface UazapiPayload {
  EventType: string;
  message?: UazapiMessage;
  chat?: UazapiChat;
  owner: string;
  token: string;
  instanceName: string;
  BaseUrl?: string;
}

interface EvolutionPayload {
  event: string;
  instance: string;
  data: any;
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
}

 async function messageExists(supabase: any, messageId: string) {
   const { data } = await supabase
     .from("messages")
     .select("id")
     .or(`metadata->>evolution_message_id.eq.${messageId},metadata->>whatsapp_message_id.eq.${messageId}`)
     .limit(1)
     .maybeSingle();
   return !!data;
 }

async function handleEvolutionWebhook(supabase: any, payload: EvolutionPayload, ownerUserId: string | null) {
  console.log(`Processing Evolution Webhook: ${payload.event}`);
  
  if (payload.event === "messages.upsert") {
    const messageData = payload.data;
    const messages = Array.isArray(messageData) ? messageData : [messageData];
    
    for (const m of messages) {
      const msg = m.message;
      if (!msg) continue;
      if (m.key?.fromMe) continue;
      
       const messageId = m.key?.id;
       if (messageId && await messageExists(supabase, messageId)) {
         console.log(`Duplicate message ignored (Evolution): ${messageId}`);
         continue;
       }

      const remoteJid = m.key?.remoteJid || "";
      const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
      
      if (remoteJid.includes("@g.us")) {
        console.log("Skipping group message from Evolution");
        continue;
      }

      const contactName = m.pushName || phone;
      let content = "";
      let messageType: "text" | "image" | "audio" | "video" | "document" = "text";

      if (msg.conversation) content = msg.conversation;
      else if (msg.extendedTextMessage) content = msg.extendedTextMessage.text;
      else if (msg.imageMessage) { messageType = "image"; content = msg.imageMessage.caption || "[Imagem]"; }
      else if (msg.videoMessage) { messageType = "video"; content = msg.videoMessage.caption || "[Vídeo]"; }
      else if (msg.audioMessage) { messageType = "audio"; content = "[Áudio]"; }
      else if (msg.documentMessage) { messageType = "document"; content = msg.documentMessage.title || "[Documento]"; }
      
      if (!content) content = "[Mensagem]";

      const phoneVariants = [phone, `+${phone}`, phone.startsWith("55") ? phone.slice(2) : phone];
      const { data: existingContacts } = await supabase.from("contacts").select("*").eq("user_id", ownerUserId).in("phone", phoneVariants).limit(1);
      let contact = existingContacts?.[0];

      if (!contact) {
        const { data: newContact } = await supabase.from("contacts").insert({ name: contactName, phone, user_id: ownerUserId }).select().single();
        contact = newContact;
      }

      if (!contact) continue;

      let { data: conversation } = await supabase.from("conversations").select("*").eq("contact_id", contact.id).eq("channel", "whatsapp").neq("status", "finalizado").order("last_message_at", { ascending: false }).limit(1).maybeSingle();

      if (!conversation) {
        const { data: newConv } = await supabase.from("conversations").insert({ contact_id: contact.id, channel: "whatsapp", status: "novo", user_id: ownerUserId }).select().single();
        conversation = newConv;
      }

      if (!conversation) continue;

      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        content,
        sender_type: "contact",
        message_type: messageType,
        status: "received",
        user_id: ownerUserId,
        metadata: { evolution_message_id: m.key?.id, evolution_raw: m }
      });

      await supabase.from("conversations").update({
        last_message: content.substring(0, 100),
        last_message_at: new Date().toISOString(),
        status: conversation.status === "finalizado" ? "novo" : conversation.status
      }).eq("id", conversation.id);
    }
  }
  
  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
    const ownerUserId = ownerData as string | null;

    const rawPayload = await req.json();
    console.log("Webhook received:", JSON.stringify(rawPayload).substring(0, 200));

    const isEvolution = !!rawPayload.event && !!rawPayload.instance;
    const isUazapi = !!rawPayload.EventType && !!rawPayload.BaseUrl;

    if (isEvolution && isUazapi) {
      console.log("Relay detected (Evo + Uazapi). Using Evolution handler.");
      return await handleEvolutionWebhook(supabase, rawPayload, ownerUserId);
    }

    if (isEvolution) {
      return await handleEvolutionWebhook(supabase, rawPayload, ownerUserId);
    }

    if (isUazapi) {
      const payload = rawPayload as UazapiPayload;
      if (payload.EventType === "messages" && payload.message && payload.chat) {
        const msg = payload.message;
        if (msg.wasSentByApi || msg.isGroup) return new Response(JSON.stringify({ success: true, skipped: true }), { headers: corsHeaders });

         const messageId = msg.messageid;
         if (messageId && await messageExists(supabase, messageId)) {
           console.log(`Duplicate message ignored (Uazapi): ${messageId}`);
           return new Response(JSON.stringify({ success: true, duplicate: true }), { headers: corsHeaders });
         }

        const phone = msg.chatid.replace("@s.whatsapp.net", "").replace("@c.us", "");
        const contactName = msg.senderName || payload.chat.wa_name || phone;
        const content = typeof msg.content === "string" ? msg.content : (msg.content as any)?.text || msg.text || "[Mensagem]";

        const { data: contact } = await supabase.from("contacts").select("id").eq("phone", phone).eq("user_id", ownerUserId).maybeSingle();
        let contactId = contact?.id;
        if (!contactId) {
          const { data: newContact } = await supabase.from("contacts").insert({ name: contactName, phone, user_id: ownerUserId }).select("id").single();
          contactId = newContact?.id;
        }

        let { data: conv } = await supabase.from("conversations").select("id").eq("contact_id", contactId).neq("status", "finalizado").limit(1).maybeSingle();
        if (!conv) {
          const { data: newConv } = await supabase.from("conversations").insert({ contact_id: contactId, channel: "whatsapp", status: "novo", user_id: ownerUserId }).select("id").single();
          conv = newConv;
        }

        await supabase.from("messages").insert({
          conversation_id: conv?.id,
          content,
          sender_type: "contact",
          message_type: "text",
          status: "received",
          user_id: ownerUserId,
          metadata: { whatsapp_message_id: msg.messageid }
        });

        await supabase.from("conversations").update({ last_message: content.substring(0, 100), last_message_at: new Date().toISOString() }).eq("id", conv?.id);
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, unknown: true }), { headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
  }
});
