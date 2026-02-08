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
    const fromMe = message.sender_type === "agent";

    // Also check for whatsapp_message_id in uazapi_response (for agent messages)
    const uazapiResponse = metadata?.uazapi_response as Record<string, unknown> | undefined;
    const altMessageId = uazapiResponse?.messageid as string | undefined;
    const altChatId = uazapiResponse?.chatid as string | undefined;

    const finalMessageId = whatsappMessageId || altMessageId;
    const finalChatId = chatid || altChatId;

    // If we have whatsapp message id, try to delete on WhatsApp
    if (finalMessageId && finalChatId) {
      console.log(`Deleting WhatsApp message: ${finalMessageId} in chat: ${finalChatId}, fromMe: ${fromMe}`);

      // Try different body formats to find the correct one
      // Format 1: Standard UAZAPI format
      const requestBodyV1 = {
        Id: finalMessageId,
        chatid: finalChatId,
        everyone: deleteForEveryone,
        fromMe: fromMe,
      };

      console.log("Trying format V1:", JSON.stringify(requestBodyV1));

      let uazapiRes = await fetch(`${UAZAPI_SERVER_URL}/message/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_INSTANCE_TOKEN,
        },
        body: JSON.stringify(requestBodyV1),
      });

      let responseText = await uazapiRes.text();
      console.log("UAZAPI V1 response status:", uazapiRes.status);
      console.log("UAZAPI V1 response:", responseText);

      // If V1 failed, try format V2 with remoteJid
      if (!uazapiRes.ok) {
        console.log("V1 failed, trying format V2 with remoteJid...");
        
        const requestBodyV2 = {
          id: finalMessageId,
          remoteJid: finalChatId,
          fromMe: fromMe,
        };

        console.log("Trying format V2:", JSON.stringify(requestBodyV2));

        uazapiRes = await fetch(`${UAZAPI_SERVER_URL}/message/delete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": UAZAPI_INSTANCE_TOKEN,
          },
          body: JSON.stringify(requestBodyV2),
        });

        responseText = await uazapiRes.text();
        console.log("UAZAPI V2 response status:", uazapiRes.status);
        console.log("UAZAPI V2 response:", responseText);
      }

      // If still failed, try format V3 with msgId
      if (!uazapiRes.ok) {
        console.log("V2 failed, trying format V3 with msgId...");
        
        const requestBodyV3 = {
          msgId: finalMessageId,
          chatid: finalChatId,
        };

        console.log("Trying format V3:", JSON.stringify(requestBodyV3));

        uazapiRes = await fetch(`${UAZAPI_SERVER_URL}/message/delete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": UAZAPI_INSTANCE_TOKEN,
          },
          body: JSON.stringify(requestBodyV3),
        });

        responseText = await uazapiRes.text();
        console.log("UAZAPI V3 response status:", uazapiRes.status);
        console.log("UAZAPI V3 response:", responseText);
      }

      if (!uazapiRes.ok) {
        console.error("All UAZAPI delete attempts failed:", responseText);
        // Continue to delete from database even if UAZAPI fails
      } else {
        console.log("Message deleted from WhatsApp successfully");
      }
    } else {
      console.log("No WhatsApp message ID found, deleting only from database");
      console.log("Metadata:", JSON.stringify(metadata));
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
