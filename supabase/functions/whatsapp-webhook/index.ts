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
    // Use POST /message/download endpoint with messageId in body
    const downloadUrl = `${UAZAPI_SERVER_URL}/message/download`;
    console.log("Downloading media from:", downloadUrl, "with id:", messageId);

    // UAZAPI v2 expects "id" (lowercase) for the message ID
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

    // Check content type to determine if it's JSON with URL or binary data
    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      // Response contains a URL or base64
      const data = await response.json();
      console.log("Download response:", JSON.stringify(data));
      
      // UAZAPI v2 returns fileURL (not url or link)
      const mediaDownloadUrl = data.fileURL || data.url || data.link || data.base64;
      
      if (data.base64) {
        // Convert base64 to binary and upload
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
      
      // Download from the URL
      const mediaResponse = await fetch(mediaDownloadUrl);
      if (!mediaResponse.ok) {
        console.error(`Failed to download from URL: ${mediaResponse.status}`);
        return null;
      }
      const mediaBuffer = await mediaResponse.arrayBuffer();
      return await uploadToStorage(supabase, mediaBuffer, messageId, messageType, mimetype, SUPABASE_URL!);
    } else {
      // Response is binary data
      const mediaBuffer = await response.arrayBuffer();
      const responseMimetype = contentType.split(";")[0].trim() || mimetype;
      return await uploadToStorage(supabase, mediaBuffer, messageId, messageType, responseMimetype, SUPABASE_URL!);
    }
  } catch (error) {
    console.error("Error downloading/storing media:", error);
    return null;
  }
}

// Helper function to upload media to Supabase Storage
async function uploadToStorage(
  supabase: ReturnType<typeof createClient>,
  mediaBuffer: ArrayBuffer,
  messageId: string,
  messageType: string,
  mimetype: string | null,
  supabaseUrl: string
): Promise<string | null> {
  const contentType = mimetype || "application/octet-stream";
  
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

    const payload: UazapiPayload = await req.json();
    console.log("Webhook received:", payload.EventType);
    console.log("Payload:", JSON.stringify(payload).substring(0, 500));

    // Handle reaction messages
    if (payload.EventType === "messages" && payload.message) {
      const msg = payload.message;
      const msgType = (msg.messageType || "").toLowerCase();
      
      if (msgType === "reactionmessage") {
        console.log("Processing reaction message");
        
        // Get the reaction content
        const reactionContent = typeof msg.content === "object" ? msg.content : null;
        const emoji = reactionContent?.text || "";
        const targetMessageId = reactionContent?.key?.ID || reactionContent?.key?.id || "";
        
        console.log(`Reaction: ${emoji} on message ${targetMessageId}`);
        
        if (targetMessageId && emoji) {
          console.log(`Searching for message with whatsapp_message_id: ${targetMessageId}`);
          
          // Find the message that was reacted to
          // Use textSearch on the metadata JSON column
          const { data: messages, error: queryError } = await supabase
            .from("messages")
            .select("id, metadata")
            .textSearch("metadata", targetMessageId, { type: "plain" });
          
          if (queryError) {
            console.error("textSearch error:", queryError.message);
            
            // Fallback: get recent messages and filter manually
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

    // Handle incoming messages (including messages sent from mobile phone)
    if (payload.EventType === "messages" && payload.message && payload.chat) {
      const msg = payload.message;
      const chat = payload.chat;

      // Skip messages sent by API (our system) to avoid duplicates
      // But process fromMe messages (sent from mobile phone) to mirror them
      if (msg.wasSentByApi) {
        console.log("Skipping API-sent message (already saved locally)");
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

      // Determine if this is an outgoing message from mobile phone
      const isFromMobile = msg.fromMe && !msg.wasSentByApi;
      if (isFromMobile) {
        console.log("Processing message sent from mobile phone (mirroring)");
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
          // Fallback to original WhatsApp URL (may expire after a few hours)
          if (originalMediaUrl) {
            mediaUrl = originalMediaUrl;
            console.log("Using original WhatsApp URL as fallback:", mediaUrl);
          } else {
            console.log("No media URL available");
          }
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
      } else {
        // Update avatar_url if we have a new one (WhatsApp avatar URLs expire)
        if (chat.imagePreview && chat.imagePreview !== contact.avatar_url) {
          console.log("Updating contact avatar:", contactName);
          const { error: updateError } = await supabase
            .from("contacts")
            .update({ avatar_url: chat.imagePreview })
            .eq("id", contact.id);
          
          if (updateError) {
            console.error("Error updating contact avatar:", updateError);
          } else {
            contact.avatar_url = chat.imagePreview;
          }
        }
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
            unread_count: isFromMobile ? 0 : 1, // Don't count as unread if sent from mobile
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
        // Only increment unread_count for incoming messages (not from mobile)
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

      // Save message - sender_type depends on whether it was sent from mobile or by contact
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          content,
          sender_type: isFromMobile ? "agent" : "contact",
          message_type: messageType,
          media_url: mediaUrl,
          status: isFromMobile ? "sent" : "delivered",
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

      if (msgError) {
        console.error("Error saving message:", msgError);
        throw msgError;
      }

      console.log("Message saved successfully");

      // === AUTO-REPLY BOT (only for incoming messages from Nuvemshop customers) ===
      if (!isFromMobile && messageType === "text" && content && content !== "[Mensagem]") {
        try {
          // Check if bot is active
          const { data: botConfig } = await supabase
            .from("bot_settings")
            .select("is_active, value")
            .eq("key", "chatbot_nuvemshop")
            .single();

          if (botConfig?.is_active) {
            // Check if this phone belongs to a Nuvemshop customer
            // Try multiple phone formats for matching
            const phoneVariants = [phone];
            if (phone.startsWith("55")) phoneVariants.push(phone.slice(2));
            if (!phone.startsWith("55")) phoneVariants.push("55" + phone);

            let isNuvemshopCustomer = false;
            for (const pv of phoneVariants) {
              const { data: customer } = await supabase
                .from("imported_customers")
                .select("id, name")
                .eq("phone", pv)
                .eq("source", "nuvemshop")
                .limit(1)
                .maybeSingle();

              if (customer) {
                isNuvemshopCustomer = true;
                break;
              }
            }

            if (isNuvemshopCustomer) {
              console.log("Nuvemshop customer detected, auto-replying...");

              const settings = botConfig.value as Record<string, unknown>;
              const systemPrompt = (settings.system_prompt as string) || "Você é um assistente de atendimento ao cliente.";
              const model = (settings.model as string) || "llama-3.3-70b-versatile";
              const maxTokens = (settings.max_tokens as number) || 512;

              // Get last 10 messages for context
              const { data: recentMsgs } = await supabase
                .from("messages")
                .select("content, sender_type")
                .eq("conversation_id", conversation.id)
                .order("created_at", { ascending: false })
                .limit(10);

              const chatHistory = (recentMsgs || []).reverse().map((m: any) => ({
                role: m.sender_type === "contact" ? "user" : "assistant",
                content: m.content,
              }));

              // Call Groq
              const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
              if (GROQ_API_KEY) {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model,
                    messages: [
                      { role: "system", content: systemPrompt },
                      ...chatHistory,
                    ],
                    temperature: 0.7,
                    max_tokens: maxTokens,
                  }),
                });

                if (groqRes.ok) {
                  const groqData = await groqRes.json();
                  const reply = groqData.choices?.[0]?.message?.content;

                  if (reply) {
                    // Send via UAZAPI
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
                        // Save bot reply as message
                        await supabase.from("messages").insert({
                          conversation_id: conversation.id,
                          content: reply,
                          sender_type: "agent",
                          message_type: "text",
                          status: "sent",
                          metadata: { from_bot: true, model },
                        });

                        // Update conversation
                        await supabase.from("conversations").update({
                          last_message: reply,
                          last_message_at: new Date().toISOString(),
                        }).eq("id", conversation.id);

                        console.log("Bot reply sent successfully");
                      } else {
                        console.error("Failed to send bot reply via UAZAPI:", await sendRes.text());
                      }
                    }
                  }
                } else {
                  console.error("Groq API error:", await groqRes.text());
                }
              }
            } else {
              console.log("Phone not in Nuvemshop customers, skipping bot");
            }
          }
        } catch (botError) {
          console.error("Bot auto-reply error:", botError);
          // Don't throw - bot errors shouldn't break webhook
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
