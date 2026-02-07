import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteMessageRequest {
  messageId: string;
  conversationId: string;
  deleteForEveryone?: boolean;
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

    const { messageId, conversationId, deleteForEveryone = true }: DeleteMessageRequest = await req.json();

    if (!messageId || !conversationId) {
      throw new Error("messageId and conversationId are required");
    }

    // Get message details to find whatsapp_message_id
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (msgError || !message) {
      throw new Error("Message not found");
    }

    const metadata = message.metadata as Record<string, unknown> | null;
    const whatsappMessageId = metadata?.whatsapp_message_id as string | undefined;
    const chatid = metadata?.chatid as string | undefined;

    // If we have whatsapp message id, try to delete on WhatsApp
    if (whatsappMessageId && chatid) {
      console.log(`Deleting WhatsApp message: ${whatsappMessageId} in chat: ${chatid}`);

      // UAZAPI v2 endpoint for deleting messages: POST /message/delete
      // Documentation indicates using "Id" (PascalCase) similar to /message/react
      const requestBody = {
        Id: whatsappMessageId,
        chatid: chatid,
        everyone: deleteForEveryone,
      };

      console.log("Delete request body:", JSON.stringify(requestBody));

      const uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/message/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_INSTANCE_TOKEN,
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await uazapiResponse.text();
      console.log("UAZAPI delete response status:", uazapiResponse.status);
      console.log("UAZAPI delete response:", responseText);

      if (!uazapiResponse.ok) {
        console.error("UAZAPI delete error:", responseText);
        // Continue to delete from database even if UAZAPI fails
        // The message might have been already deleted or the ID is invalid
      }
    } else {
      console.log("No WhatsApp message ID found, deleting only from database");
    }

    // Delete message from database
    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) {
      console.error("Database delete error:", deleteError);
      throw new Error("Failed to delete message from database");
    }

    // Update conversation's last_message if this was the last message
    const { data: lastMessage } = await supabase
      .from("messages")
      .select("content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastMessage) {
      await supabase
        .from("conversations")
        .update({
          last_message: lastMessage.content,
          last_message_at: lastMessage.created_at,
        })
        .eq("id", conversationId);
    } else {
      // No messages left, clear last_message
      await supabase
        .from("conversations")
        .update({
          last_message: null,
          last_message_at: null,
        })
        .eq("id", conversationId);
    }

    return new Response(
      JSON.stringify({ success: true, deleted: messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting message:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
