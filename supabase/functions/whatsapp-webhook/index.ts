import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, token",
};

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

    const payload = await req.json();
    console.log("Webhook payload received:", JSON.stringify(payload, null, 2));

    // UAZAPI sends different event types
    const { event, data } = payload;

    // Handle incoming messages
    if (event === "messages.upsert" && data?.messages) {
      for (const msg of data.messages) {
        // Skip status updates and outgoing messages
        if (msg.key?.fromMe || !msg.message) continue;

        const remoteJid = msg.key?.remoteJid;
        if (!remoteJid) continue;

        // Extract phone number from remoteJid (format: 5521999999999@s.whatsapp.net)
        const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
        
        // Get message content based on type
        let content = "";
        let messageType: "text" | "image" | "audio" | "video" | "document" = "text";
        let mediaUrl: string | null = null;

        if (msg.message.conversation) {
          content = msg.message.conversation;
        } else if (msg.message.extendedTextMessage?.text) {
          content = msg.message.extendedTextMessage.text;
        } else if (msg.message.imageMessage) {
          messageType = "image";
          content = msg.message.imageMessage.caption || "[Imagem]";
          mediaUrl = msg.message.imageMessage.url || null;
        } else if (msg.message.audioMessage) {
          messageType = "audio";
          content = "[Áudio]";
          mediaUrl = msg.message.audioMessage.url || null;
        } else if (msg.message.videoMessage) {
          messageType = "video";
          content = msg.message.videoMessage.caption || "[Vídeo]";
          mediaUrl = msg.message.videoMessage.url || null;
        } else if (msg.message.documentMessage) {
          messageType = "document";
          content = msg.message.documentMessage.fileName || "[Documento]";
          mediaUrl = msg.message.documentMessage.url || null;
        } else {
          // Unknown message type
          content = "[Mensagem não suportada]";
        }

        // Find or create contact
        let { data: contact } = await supabase
          .from("contacts")
          .select("*")
          .eq("phone", phone)
          .single();

        if (!contact) {
          // Create new contact
          const pushName = msg.pushName || phone;
          const { data: newContact, error: contactError } = await supabase
            .from("contacts")
            .insert({
              name: pushName,
              phone: phone,
            })
            .select()
            .single();

          if (contactError) {
            console.error("Error creating contact:", contactError);
            continue;
          }
          contact = newContact;
        }

        // Find or create conversation
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
          // Create new conversation
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
            continue;
          }
          conversation = newConv;
        } else {
          // Update existing conversation
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

        // Save message
        const { error: msgError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversation.id,
            content,
            sender_type: "contact",
            message_type: messageType,
            media_url: mediaUrl,
            status: "delivered",
            metadata: {
              whatsapp_message_id: msg.key?.id,
              remote_jid: remoteJid,
              push_name: msg.pushName,
              timestamp: msg.messageTimestamp,
            },
          });

        if (msgError) {
          console.error("Error saving message:", msgError);
        }
      }
    }

    // Handle message status updates
    if (event === "messages.update" && data?.messages) {
      for (const update of data.messages) {
        if (update.update?.status) {
          const statusMap: Record<number, string> = {
            2: "sent",
            3: "delivered",
            4: "read",
          };
          const newStatus = statusMap[update.update.status] || "sent";

          // Update message status by whatsapp_message_id in metadata
          await supabase
            .from("messages")
            .update({ status: newStatus })
            .filter("metadata->whatsapp_message_id", "eq", update.key?.id);
        }
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
