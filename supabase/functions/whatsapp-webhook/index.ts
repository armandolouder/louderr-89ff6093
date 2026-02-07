import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, token",
};

interface UazapiMessage {
  id: string;
  messageid: string;
  chatid: string;
  content: string;
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload: UazapiPayload = await req.json();
    console.log("Webhook received:", payload.EventType);

    // Handle incoming messages
    if (payload.EventType === "messages" && payload.message && payload.chat) {
      const msg = payload.message;
      const chat = payload.chat;

      // Skip outgoing messages and messages sent by API
      if (msg.fromMe || msg.wasSentByApi) {
        console.log("Skipping outgoing/API message");
        return new Response(
          JSON.stringify({ success: true, skipped: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Skip group messages
      if (msg.isGroup) {
        console.log("Skipping group message");
        return new Response(
          JSON.stringify({ success: true, skipped: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract phone number from chatid (format: 5521999999999@s.whatsapp.net)
      const phone = msg.chatid.replace("@s.whatsapp.net", "").replace("@c.us", "");
      const contactName = msg.senderName || chat.wa_name || chat.name || phone;

      // Get message content
      const content = msg.text || msg.content || "[Mensagem sem texto]";

      // Determine message type
      let messageType: "text" | "image" | "audio" | "video" | "document" = "text";
      if (msg.type === "image" || msg.mediaType === "image") {
        messageType = "image";
      } else if (msg.type === "audio" || msg.mediaType === "audio" || msg.type === "ptt") {
        messageType = "audio";
      } else if (msg.type === "video" || msg.mediaType === "video") {
        messageType = "video";
      } else if (msg.type === "document" || msg.mediaType === "document") {
        messageType = "document";
      }

      console.log(`Processing message from ${contactName} (${phone}): ${content}`);

      // Find or create contact
      let { data: contact } = await supabase
        .from("contacts")
        .select("*")
        .eq("phone", phone)
        .single();

      if (!contact) {
        console.log("Creating new contact:", contactName);
        const { data: newContact, error: contactError } = await supabase
          .from("contacts")
          .insert({
            name: contactName,
            phone: phone,
            avatar_url: chat.imagePreview || null,
          })
          .select()
          .single();

        if (contactError) {
          console.error("Error creating contact:", contactError);
          throw contactError;
        }
        contact = newContact;
      }

      // Find open conversation or create new one
      let { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("contact_id", contact.id)
        .eq("channel", "whatsapp")
        .neq("status", "finalizado")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!conversation) {
        console.log("Creating new conversation");
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            contact_id: contact.id,
            channel: "whatsapp",
            status: "novo",
            last_message: content,
            last_message_at: new Date().toISOString(),
            unread_count: 1,
          })
          .select()
          .single();

        if (convError) {
          console.error("Error creating conversation:", convError);
          throw convError;
        }
        conversation = newConv;
      } else {
        console.log("Updating existing conversation");
        await supabase
          .from("conversations")
          .update({
            last_message: content,
            last_message_at: new Date().toISOString(),
            unread_count: (conversation.unread_count || 0) + 1,
            status: conversation.status === "finalizado" ? "novo" : conversation.status,
          })
          .eq("id", conversation.id);
      }

      // Check for duplicate message
      const { data: existingMsg } = await supabase
        .from("messages")
        .select("id")
        .eq("metadata->whatsapp_message_id", msg.messageid)
        .single();

      if (existingMsg) {
        console.log("Duplicate message, skipping");
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "duplicate" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save message
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          content,
          sender_type: "contact",
          message_type: messageType,
          status: "delivered",
          metadata: {
            whatsapp_message_id: msg.messageid,
            chatid: msg.chatid,
            sender_name: msg.senderName,
            timestamp: msg.messageTimestamp,
            instance_name: payload.instanceName,
          },
        });

      if (msgError) {
        console.error("Error saving message:", msgError);
        throw msgError;
      }

      console.log("Message saved successfully");
    }

    // Handle message status updates
    if (payload.EventType === "messages_update" && payload.message) {
      const msg = payload.message;
      if (msg.status) {
        const statusMap: Record<string, string> = {
          "pending": "sent",
          "sent": "sent",
          "delivered": "delivered",
          "read": "read",
          "played": "read",
        };
        const newStatus = statusMap[msg.status] || "sent";

        await supabase
          .from("messages")
          .update({ status: newStatus })
          .eq("metadata->whatsapp_message_id", msg.messageid);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
