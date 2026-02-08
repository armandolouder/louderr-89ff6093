import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendReactionRequest {
  messageId: string;
  emoji: string;
  conversationId: string;
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

    const { messageId, emoji, conversationId }: SendReactionRequest = await req.json();

    if (!messageId || !emoji) {
      throw new Error("messageId and emoji are required");
    }

    // Get the message to find the WhatsApp message ID
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .select("*, conversation:conversations(*, contact:contacts(*))")
      .eq("id", messageId)
      .single();

    if (msgError || !message) {
      throw new Error("Message not found");
    }

    const whatsappMessageId = message.metadata?.whatsapp_message_id;
    const chatId = message.metadata?.chatid;

    if (!whatsappMessageId || !chatId) {
      throw new Error("WhatsApp message ID not found in message metadata");
    }

    console.log(`Sending reaction ${emoji} to message ${whatsappMessageId}`);

    // UAZAPI v2 /message/react expects:
    // - number: chat ID in format "5511999999999@s.whatsapp.net"
    // - text: the emoji (or empty string to remove)
    // - id: the WhatsApp message ID (lowercase!)
    const requestBody = {
      number: chatId,
      text: emoji,
      id: whatsappMessageId,
    };

    console.log("Request body:", JSON.stringify(requestBody));

    const uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/message/react`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": UAZAPI_INSTANCE_TOKEN,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await uazapiResponse.text();
    console.log("UAZAPI response status:", uazapiResponse.status);
    console.log("UAZAPI response:", responseText);

    if (!uazapiResponse.ok) {
      console.error("UAZAPI error:", responseText);
      throw new Error(`Failed to send reaction via UAZAPI: ${uazapiResponse.status} - ${responseText}`);
    }

    let uazapiData;
    try {
      uazapiData = JSON.parse(responseText);
    } catch {
      uazapiData = { raw: responseText };
    }

    // Update message metadata with reaction
    const existingReactions = message.metadata?.reactions || [];
    const newReactions = [...existingReactions, { emoji, sent_at: new Date().toISOString() }];

    await supabase
      .from("messages")
      .update({
        metadata: {
          ...message.metadata,
          reactions: newReactions,
        },
      })
      .eq("id", messageId);

    return new Response(
      JSON.stringify({ success: true, uazapiData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending reaction:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
