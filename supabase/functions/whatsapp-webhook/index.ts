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
    const downloadUrl = `${UAZAPI_SERVER_URL}/message/download`;
    console.log("Downloading media from:", downloadUrl, "with id:", messageId);

    const response = await fetch(downloadUrl, {
      method: "POST",
      headers: {
        "token": UAZAPI_INSTANCE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: messageId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to download media: ${response.status} ${response.statusText}`, errorText);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      const data = await response.json();
      console.log("Download response:", JSON.stringify(data));
      
      const mediaDownloadUrl = data.fileURL || data.url || data.link || data.base64;
      
      if (data.base64) {
        const base64Data = data.base64.replace(/^data:[^;]+;base64,/, "");
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return await uploadToStorage(supabase, bytes.buffer, messageId, messageType, mimetype || data.mimetype, SUPABASE_URL!);
      }
      
      if (!mediaDownloadUrl) {
        console.error("No download URL in response:", data);
        return null;
      }
      
      const mediaResponse = await fetch(mediaDownloadUrl);
      if (!mediaResponse.ok) {
        console.error(`Failed to download from URL: ${mediaResponse.status}`);
        return null;
      }
      const mediaBuffer = await mediaResponse.arrayBuffer();
      return await uploadToStorage(supabase, mediaBuffer, messageId, messageType, mimetype, SUPABASE_URL!);
    } else {
      const mediaBuffer = await response.arrayBuffer();
      const responseMimetype = contentType.split(";")[0].trim() || mimetype;
      return await uploadToStorage(supabase, mediaBuffer, messageId, messageType, responseMimetype, SUPABASE_URL!);
    }
  } catch (error) {
    console.error("Error downloading/storing media:", error);
    return null;
  }
}

async function uploadToStorage(
  supabase: ReturnType<typeof createClient>,
  mediaBuffer: ArrayBuffer,
  messageId: string,
  messageType: string,
  mimetype: string | null,
  supabaseUrl: string
): Promise<string | null> {
  const contentType = mimetype || "application/octet-stream";
  
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
  
  const timestamp = Date.now();
  const folder = messageType === "image" ? "images" :
                 messageType === "video" ? "videos" :
                 messageType === "audio" ? "audios" : "documents";
  const filename = `${folder}/${timestamp}_${messageId}.${ext}`;

  console.log(`Uploading to storage: ${filename} (${contentType})`);

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

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/whatsapp-media/${filename}`;
  console.log("Media stored at:", publicUrl);
  
  return publicUrl;
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

    // Resolve owner user_id for multi-tenant data isolation
    const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
    const ownerUserId = ownerData as string | null;
    console.log("Webhook owner user_id:", ownerUserId);

    const payload: UazapiPayload = await req.json();
    console.log("Webhook received:", payload.EventType);
    console.log("Payload:", JSON.stringify(payload).substring(0, 500));

    // Handle reaction messages
    if (payload.EventType === "messages" && payload.message) {
      const msg = payload.message;
      const msgType = (msg.messageType || "").toLowerCase();
      
      if (msgType === "reactionmessage") {
        console.log("Processing reaction message");
        
        const reactionContent = typeof msg.content === "object" ? msg.content : null;
        const emoji = reactionContent?.text || "";
        const targetMessageId = reactionContent?.key?.ID || reactionContent?.key?.id || "";
        
        console.log(`Reaction: ${emoji} on message ${targetMessageId}`);
        
        if (targetMessageId && emoji) {
          console.log(`Searching for message with whatsapp_message_id: ${targetMessageId}`);
          
          const { data: messages, error: queryError } = await supabase
            .from("messages")
            .select("id, metadata")
            .textSearch("metadata", targetMessageId, { type: "plain" });
          
          if (queryError) {
            console.error("textSearch error:", queryError.message);
            
            const { data: recentMessages } = await supabase
              .from("messages")
              .select("id, metadata")
              .order("created_at", { ascending: false })
              .limit(100);
            
            const foundMessage = recentMessages?.find(m => {
              const meta = m.metadata as Record<string, unknown>;
              return meta?.whatsapp_message_id === targetMessageId;
            });
            
            if (foundMessage) {
              console.log(`Found message via fallback: ${foundMessage.id}`);
              
              const metadata = (foundMessage.metadata as Record<string, unknown>) || {};
              const existingReactions = (metadata.reactions as Array<{ emoji: string; sent_at: string }>) || [];
              
              const newReaction = { emoji, sent_at: new Date().toISOString() };
              const hasReaction = existingReactions.some(r => r.emoji === emoji);
              
              if (!hasReaction) {
                existingReactions.push(newReaction);
                
                const { error: updateError } = await supabase
                  .from("messages")
                  .update({
                    metadata: { ...metadata, reactions: existingReactions }
                  })
                  .eq("id", foundMessage.id);
                
                if (updateError) {
                  console.error("Error updating reactions:", updateError);
                } else {
                  console.log("Reaction saved successfully via fallback");
                }
              }
            } else {
              console.log("Message not found via fallback either");
            }
          } else {
            const targetMessage = messages?.[0];
            
            if (targetMessage) {
              console.log(`Found target message: ${targetMessage.id}`);
              
              const metadata = (targetMessage.metadata as Record<string, unknown>) || {};
              const existingReactions = (metadata.reactions as Array<{ emoji: string; sent_at: string }>) || [];
              
              const newReaction = { emoji, sent_at: new Date().toISOString() };
              const hasReaction = existingReactions.some(r => r.emoji === emoji);
              
              if (!hasReaction) {
                existingReactions.push(newReaction);
                
                const { error: updateError } = await supabase
                  .from("messages")
                  .update({
                    metadata: { ...metadata, reactions: existingReactions }
                  })
                  .eq("id", targetMessage.id);
                
                if (updateError) {
                  console.error("Error updating reactions:", updateError);
                } else {
                  console.log("Reaction saved successfully");
                }
              } else {
                console.log("Reaction already exists");
              }
            } else {
              console.log("Target message not found. Query returned:", messages?.length || 0, "results");
            }
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, type: "reaction" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle incoming messages
    if (payload.EventType === "messages" && payload.message && payload.chat) {
      const msg = payload.message;
      const chat = payload.chat;

      if (msg.wasSentByApi) {
        console.log("Skipping API-sent message (already saved locally)");
        return new Response(
          JSON.stringify({ success: true, skipped: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (msg.isGroup) {
        console.log("Skipping group message");
        return new Response(
          JSON.stringify({ success: true, skipped: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isFromMobile = msg.fromMe && !msg.wasSentByApi;
      if (isFromMobile) {
        console.log("Processing message sent from mobile phone (mirroring)");
      }

      const phone = msg.chatid.replace("@s.whatsapp.net", "").replace("@c.us", "");
      const contactName = msg.senderName || chat.wa_name || chat.name || phone;

      let mediaUrl: string | null = null;
      let content = "";
      let messageType: "text" | "image" | "audio" | "video" | "document" = "text";
      let mimetype: string | null = null;
      let filename: string | null = null;
      let originalMediaUrl: string | null = null;

      if (typeof msg.content === "object" && msg.content !== null) {
        const contentObj = msg.content as UazapiMediaContent;
        if (contentObj.URL) originalMediaUrl = contentObj.URL;
        mimetype = contentObj.mimetype || null;
        filename = contentObj.filename || null;
        content = contentObj.caption || contentObj.text || "";
      } else if (typeof msg.content === "string") {
        content = msg.content;
      }

      if (!content && msg.text) content = msg.text;

      const msgMediaType = (msg.mediaType || "").toLowerCase();
      const msgTypeStr = (msg.messageType || "").toLowerCase();

      if (msgMediaType === "image" || msgTypeStr.includes("image")) {
        messageType = "image";
        if (!content) content = "[Imagem]";
      } else if (msgMediaType === "audio" || msgTypeStr.includes("audio") || msgTypeStr.includes("ptt")) {
        messageType = "audio";
        if (!content) content = "[Áudio]";
      } else if (msgMediaType === "video" || msgTypeStr.includes("video")) {
        messageType = "video";
        if (!content) content = "[Vídeo]";
      } else if (msgMediaType === "document" || msgTypeStr.includes("document")) {
        messageType = "document";
        if (!content) content = filename || "[Documento]";
      } else if (msgTypeStr.includes("sticker")) {
        messageType = "image";
        if (!content) content = "[Sticker]";
      }

      if (messageType !== "text" && msg.messageid) {
        console.log(`Downloading ${messageType} media for message ${msg.messageid}`);
        const storedUrl = await downloadAndStoreMedia(supabase, msg.messageid, messageType, mimetype);
        if (storedUrl) {
          mediaUrl = storedUrl;
        } else if (originalMediaUrl) {
          mediaUrl = originalMediaUrl;
        }
      }

      if (!content) content = "[Mensagem]";

      console.log(`Processing ${messageType} from ${contactName} (${phone})`);

      // Check for duplicate webhook
      const { data: existingMsg } = await supabase
        .from("messages")
        .select("id")
        .eq("metadata->whatsapp_message_id", msg.messageid)
        .limit(1)
        .maybeSingle();

      if (existingMsg) {
        console.log("Duplicate message, skipping");
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "duplicate" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find or create contact
      let contact: any = null;
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("*")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();

      if (!existingContact) {
        console.log("Creating new contact:", contactName);
        const { data: newContact, error: contactError } = await supabase
          .from("contacts")
          .insert({ name: contactName, phone, avatar_url: chat.imagePreview || null, user_id: ownerUserId })
          .select()
          .single();

        if (contactError) {
          if (contactError.code === "23505") {
            const { data: raceContact } = await supabase
              .from("contacts").select("*").eq("phone", phone).limit(1).maybeSingle();
            contact = raceContact;
          } else {
            console.error("Error creating contact:", contactError);
            throw contactError;
          }
        } else {
          contact = newContact;
        }
      } else {
        contact = existingContact;
        if (chat.imagePreview && chat.imagePreview !== contact.avatar_url) {
          await supabase.from("contacts").update({ avatar_url: chat.imagePreview }).eq("id", contact.id);
        }
      }

      if (!contact) throw new Error("Failed to resolve contact");

      // Find latest open conversation
      let { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("contact_id", contact.id)
        .eq("channel", "whatsapp")
        .neq("status", "finalizado")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

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
            unread_count: isFromMobile ? 0 : 1,
            user_id: ownerUserId,
          })
          .select()
          .single();

        if (convError) throw convError;
        conversation = newConv;
      } else {
        const newUnreadCount = isFromMobile
          ? (conversation.unread_count || 0)
          : (conversation.unread_count || 0) + 1;

        await supabase
          .from("conversations")
          .update({
            last_message: displayContent,
            last_message_at: new Date().toISOString(),
            unread_count: newUnreadCount,
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
          sender_type: isFromMobile ? "agent" : "contact",
          message_type: messageType,
          media_url: mediaUrl,
          status: isFromMobile ? "sent" : "delivered",
          user_id: ownerUserId,
          metadata: {
            whatsapp_message_id: msg.messageid,
            chatid: msg.chatid,
            sender_name: msg.senderName,
            timestamp: msg.messageTimestamp,
            instance_name: payload.instanceName,
            mimetype,
            filename,
            original_media_url: originalMediaUrl,
            from_mobile: isFromMobile,
          },
        });

      if (msgError) throw msgError;
      console.log("Message saved successfully");

      // === MENU-BASED AUTO-REPLY BOT ===
      if (!isFromMobile && messageType === "text" && content && content !== "[Mensagem]") {
        try {
          const { data: botConfig } = await supabase
            .from("bot_settings")
            .select("is_active, value")
            .eq("key", "chatbot_nuvemshop")
            .single();

          if (botConfig?.is_active) {
            const settings = botConfig.value as Record<string, unknown>;
            const welcomeMessage = (settings.welcome_message as string) || "Olá! Como posso ajudar?";

            {
              // Check if this phone belongs to a Nuvemshop customer
              const phoneVariants = [phone];
              if (phone.startsWith("55")) phoneVariants.push(phone.slice(2));
              if (!phone.startsWith("55")) phoneVariants.push("55" + phone);

              let isNuvemshopCustomer = false;
              for (const pv of phoneVariants) {
                const { data: customer } = await supabase
                  .from("imported_customers")
                  .select("id")
                  .eq("phone", pv)
                  .eq("source", "nuvemshop")
                  .limit(1)
                  .maybeSingle();
                if (customer) { isNuvemshopCustomer = true; break; }
              }

              if (isNuvemshopCustomer) {
                // Check if welcome was already sent for this conversation
                const { data: existingWelcome } = await supabase
                  .from("messages")
                  .select("id")
                  .eq("conversation_id", conversation.id)
                  .eq("sender_type", "bot")
                  .limit(1)
                  .maybeSingle();

                if (existingWelcome) {
                  console.log("Welcome already sent for this conversation, skipping");
                } else {
                  console.log("Nuvemshop customer detected, sending welcome message...");

                  // Resolve variables
                  const now = new Date();
                  const brHour = (now.getUTCHours() - 3 + 24) % 24; // UTC-3
                  const saudacao = brHour < 12 ? "Bom dia" : brHour < 18 ? "Boa tarde" : "Boa noite";
                  const customerName = contactName || "cliente";

                  const replaceVars = (text: string) =>
                    text.replace(/\{nome\}/g, customerName).replace(/\{saudacao\}/g, saudacao);

                  const reply = replaceVars(welcomeMessage);

                if (reply) {
                  const UAZAPI_SERVER_URL = Deno.env.get("UAZAPI_SERVER_URL");
                  const UAZAPI_INSTANCE_TOKEN = Deno.env.get("UAZAPI_INSTANCE_TOKEN");

                  if (UAZAPI_SERVER_URL && UAZAPI_INSTANCE_TOKEN) {
                    const sendRes = await fetch(`${UAZAPI_SERVER_URL}/send/text`, {
                      method: "POST",
                      headers: {
                        "token": UAZAPI_INSTANCE_TOKEN,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ number: phone, text: reply }),
                    });

                    if (sendRes.ok) {
                      await supabase.from("messages").insert({
                        conversation_id: conversation.id,
                        content: reply,
                        sender_type: "bot",
                        message_type: "text",
                        status: "sent",
                        user_id: ownerUserId,
                        metadata: { from_bot: true, bot_type: "welcome" },
                      });

                      await supabase.from("conversations").update({
                        last_message: reply.substring(0, 100),
                        last_message_at: new Date().toISOString(),
                      }).eq("id", conversation.id);

                      console.log("Welcome bot reply sent successfully");
                    } else {
                      console.error("Failed to send bot reply:", await sendRes.text());
                    }
                  }
                }
                } // end else (no existing welcome)
              } else {
                console.log("Phone not in Nuvemshop customers, skipping bot");
              }
            }
          }
        } catch (botError) {
          console.error("Bot auto-reply error:", botError);
        }
      }
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
