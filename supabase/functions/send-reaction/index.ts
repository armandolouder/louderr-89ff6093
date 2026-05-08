import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppReaction, hasWhatsAppCredentials } from "../_shared/whatsapp.ts";

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
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

     const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
     const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 
     if (!hasWhatsAppCredentials()) {
       throw new Error("WhatsApp credentials not configured");
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

     const apiResult = await sendWhatsAppReaction({
       phone: chatId.split("@")[0],
       emoji: emoji,
       messageId: whatsappMessageId,
       isFromMe: message.sender_type === "agent" || message.sender_type === "bot"
     });
 
     console.log("WhatsApp API response status:", apiResult.status);
     console.log("WhatsApp API response:", apiResult.raw);
 
     if (!apiResult.ok) {
       console.error("WhatsApp API error:", apiResult.raw);
       throw new Error(`Failed to send reaction via WhatsApp API: ${apiResult.status} - ${apiResult.raw}`);
     }
 
     const apiData = apiResult.data;

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
       JSON.stringify({ success: true, apiData }),
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
