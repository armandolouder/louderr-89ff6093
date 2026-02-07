import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType?: "text" | "image" | "audio" | "video" | "document";
  mediaUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const UAZAPI_SERVER_URL = Deno.env.get("UAZAPI_SERVER_URL");
    const UAZAPI_INSTANCE_TOKEN = Deno.env.get("UAZAPI_INSTANCE_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!UAZAPI_SERVER_URL || !UAZAPI_INSTANCE_TOKEN) {
      throw new Error("UAZAPI credentials not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // Format phone for UAZAPI (remove non-digits and add @s.whatsapp.net)
    const formattedPhone = phone.replace(/\D/g, "") + "@s.whatsapp.net";

    let uazapiResponse;

    if (messageType === "text") {
      // Send text message via UAZAPI
      uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_INSTANCE_TOKEN,
        },
        body: JSON.stringify({
          to: formattedPhone,
          text: content,
        }),
      });
    } else if (mediaUrl) {
      // Send media message
      const mediaEndpoints: Record<string, string> = {
        image: "/sendImage",
        audio: "/sendAudio",
        video: "/sendVideo",
        document: "/sendDocument",
      };

      uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}${mediaEndpoints[messageType]}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_INSTANCE_TOKEN,
        },
        body: JSON.stringify({
          to: formattedPhone,
          url: mediaUrl,
          caption: content,
        }),
      });
    } else {
      throw new Error("Media URL required for non-text messages");
    }

    if (!uazapiResponse.ok) {
      const errorText = await uazapiResponse.text();
      console.error("UAZAPI error:", errorText);
      throw new Error(`Failed to send message via UAZAPI: ${uazapiResponse.status}`);
    }

    const uazapiData = await uazapiResponse.json();

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
        metadata: { uazapi_response: uazapiData },
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

    return new Response(
      JSON.stringify({ success: true, message, uazapiData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
