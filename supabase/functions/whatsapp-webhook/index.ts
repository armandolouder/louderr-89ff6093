import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Download media from UAZAPI and upload to Supabase Storage
async function downloadAndStoreMedia(
  supabase: ReturnType<typeof createClient>,
  messageId: string,
  messageType: string,
  mimetype: string | null
): Promise<string | null> {
  const UAZAPI_SERVER_URL = Deno.env.get("UAZAPI_SERVER_URL");
  const UAZAPI_INSTANCE_TOKEN = Deno.env.get("UAZAPI_INSTANCE_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

  if (!UAZAPI_SERVER_URL || !UAZAPI_INSTANCE_TOKEN) {
    console.error("UAZAPI credentials not configured");
    return null;
  }

  try {
    // Use UAZAPI download endpoint to get decrypted media
    const downloadUrl = `${UAZAPI_SERVER_URL}/message/download/${messageId}`;
    console.log("Downloading media from:", downloadUrl);

    const response = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        "token": UAZAPI_INSTANCE_TOKEN,
      },
    });

    if (!response.ok) {
      console.error(`Failed to download media: ${response.status} ${response.statusText}`);
      return null;
    }

    const mediaBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || mimetype || "application/octet-stream";
    
    // Determine file extension based on content type
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "video/mp4": "mp4",
      "audio/ogg": "ogg",
      "audio/mpeg": "mp3",
      "audio/opus": "opus",
      "application/pdf": "pdf",
    };
    const ext = extMap[contentType] || "bin";
    
    // Generate unique filename
    const timestamp = Date.now();
    const folder = messageType === "image" ? "images" :
                   messageType === "video" ? "videos" :
                   messageType === "audio" ? "audios" : "documents";
    const filename = `${folder}/${timestamp}_${messageId}.${ext}`;

    console.log(`Uploading to storage: ${filename} (${contentType})`);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("whatsapp-media")
      .upload(filename, mediaBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return null;
    }

    // Get public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/whatsapp-media/${filename}`;
    console.log("Media stored at:", publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error("Error downloading/storing media:", error);
    return null;
  }
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

      // Extract phone number from chatid
      const phone = msg.chatid.replace("@s.whatsapp.net", "").replace("@c.us", "");
      const contactName = msg.senderName || chat.wa_name || chat.name || phone;

      // Parse content - can be string or object
      let mediaUrl: string | null = null;
      let content = "";
      let messageType: "text" | "image" | "audio" | "video" | "document" = "text";
      let mimetype: string | null = null;
      let filename: string | null = null;
      let originalMediaUrl: string | null = null;

      // Check if content is an object (media message)
      if (typeof msg.content === "object" && msg.content !== null) {
        const contentObj = msg.content as UazapiMediaContent;
        
        // Store original URL for reference (WhatsApp CDN URL - encrypted)
        if (contentObj.URL) {
          originalMediaUrl = contentObj.URL;
        }
        
        // Get mimetype and filename
        mimetype = contentObj.mimetype || null;
        filename = contentObj.filename || null;
        
        // Get caption or text
        content = contentObj.caption || contentObj.text || "";
      } else if (typeof msg.content === "string") {
        content = msg.content;
      }

      // Fallback to text field if content is empty
      if (!content && msg.text) {
        content = msg.text;
      }

      // Determine message type based on mediaType or messageType
      const msgMediaType = (msg.mediaType || "").toLowerCase();
      const msgType = (msg.messageType || "").toLowerCase();

      if (msgMediaType === "image" || msgType.includes("image")) {
        messageType = "image";
        if (!content) content = "[Imagem]";
      } else if (msgMediaType === "audio" || msgType.includes("audio") || msgType.includes("ptt")) {
        messageType = "audio";
        if (!content) content = "[Áudio]";
      } else if (msgMediaType === "video" || msgType.includes("video")) {
        messageType = "video";
        if (!content) content = "[Vídeo]";
      } else if (msgMediaType === "document" || msgType.includes("document")) {
        messageType = "document";
        if (!content) content = filename || "[Documento]";
      } else if (msgType.includes("sticker")) {
        messageType = "image";
        if (!content) content = "[Sticker]";
      }

      // Download and store media in Supabase Storage for permanent access
      if (messageType !== "text" && msg.messageid) {
        console.log(`Downloading ${messageType} media for message ${msg.messageid}`);
        const storedUrl = await downloadAndStoreMedia(
          supabase,
          msg.messageid,
          messageType,
          mimetype
        );
        
        if (storedUrl) {
          mediaUrl = storedUrl;
          console.log("Media stored successfully:", mediaUrl);
        } else {
          console.log("Failed to store media, no URL will be saved");
        }
      }

      // Final fallback for empty content
      if (!content) {
        content = "[Mensagem]";
      }

      console.log(`Processing ${messageType} from ${contactName} (${phone})`);
      console.log(`Content: ${content.substring(0, 100)}`);
      console.log(`Media URL: ${mediaUrl || "none"}`);

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

      // Create display text for conversation list
      const displayContent = messageType === "text" ? content : 
        messageType === "image" ? "📷 Imagem" :
        messageType === "audio" ? "🎵 Áudio" :
        messageType === "video" ? "🎬 Vídeo" :
        messageType === "document" ? "📄 Documento" : content;

      if (!conversation) {
        console.log("Creating new conversation");
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            contact_id: contact.id,
            channel: "whatsapp",
            status: "novo",
            last_message: displayContent,
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
            last_message: displayContent,
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
          media_url: mediaUrl,
          status: "delivered",
          metadata: {
            whatsapp_message_id: msg.messageid,
            chatid: msg.chatid,
            sender_name: msg.senderName,
            timestamp: msg.messageTimestamp,
            instance_name: payload.instanceName,
            mimetype,
            filename,
            original_media_url: originalMediaUrl,
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
