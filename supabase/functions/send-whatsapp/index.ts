import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCorsPreflightRequest, jsonResponse } from "../_shared/cors.ts";
import { verifyUserJwt, createServiceClient } from "../_shared/auth.ts";
 import { sendWhatsAppText, sendWhatsAppMedia, hasWhatsAppCredentials } from "../_shared/whatsapp.ts";
import { digitsOnly } from "../_shared/phone.ts";

interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType?: "text" | "image" | "audio" | "video" | "document";
  mediaUrl?: string;
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  try {
    const authResult = await verifyUserJwt(req);
    if (!authResult.ok) return authResult.response;
    const authenticatedUserId = authResult.auth.userId;

     if (!hasWhatsAppCredentials()) {
       throw new Error("WhatsApp credentials not configured");
    }

    const supabase = createServiceClient();

    const { conversationId, content, messageType = "text", mediaUrl }: SendMessageRequest = await req.json();

    if (!conversationId || !content) {
      throw new Error("conversationId and content are required");
    }

    // Get conversation and contact details
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*, contact:contacts(*)")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error("Conversation not found");
    }

    const phone = conversation.contact.phone;
    if (!phone) {
      throw new Error("Contact phone number not found");
    }

    const formattedPhone = digitsOnly(phone);
    console.log(`Sending ${messageType} message to ${formattedPhone}`);

     let result: { ok: boolean; status: number; data: any; raw: string };
    if (messageType === "text") {
       result = await sendWhatsAppText(formattedPhone, content);
    } else if (mediaUrl) {
      // Resolve storage path to a signed URL for UAZAPI to download
      let fileUrl = mediaUrl;
      if (mediaUrl.startsWith("whatsapp-media:")) {
        const storagePath = mediaUrl.replace("whatsapp-media:", "");
        const { data: signedData, error: signedError } = await supabase.storage
          .from("whatsapp-media")
          .createSignedUrl(storagePath, 3600);
        if (signedError || !signedData?.signedUrl) {
          throw new Error("Failed to create signed URL for media");
        }
        fileUrl = signedData.signedUrl;
      }

       result = await sendWhatsAppMedia({
         phone: formattedPhone,
         mediaType: messageType as any,
         fileUrl,
         caption: content || "",
       });
    } else {
      throw new Error("Media URL required for non-text messages");
    }

     console.log("WhatsApp API response status:", result.status);
     console.log("WhatsApp API response:", result.raw);

    if (!result.ok) {
       console.error("WhatsApp API error:", result.raw);
       throw new Error(`Failed to send message via WhatsApp API: ${result.status} - ${result.raw}`);
     }
     const apiResponseData = result.data;

    // Save message to database
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        content,
        sender_type: "agent",
        message_type: messageType,
        media_url: mediaUrl || null,
        status: "sent",
        user_id: authenticatedUserId,
         metadata: { api_response: apiResponseData },
      })
      .select()
      .single();

    if (msgError) {
      console.error("Database error:", msgError);
      throw new Error("Failed to save message to database");
    }

    // Update conversation last message
    await supabase
      .from("conversations")
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

     return jsonResponse({ success: true, message, apiResponseData });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return jsonResponse({ success: false, error: (error as Error).message }, { status: 500 });
  }
});
