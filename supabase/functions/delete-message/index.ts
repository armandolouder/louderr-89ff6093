import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deleteEvolutionMessage } from "../_shared/evolution-api.ts";

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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { messageId, conversationId, deleteForEveryone = true }: DeleteMessageRequest = await req.json();

    if (!messageId || !conversationId) {
      throw new Error("messageId and conversationId are required");
    }

    // Get message + contact details to find the WhatsApp message id
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .select("*, conversation:conversations(contact:contacts(phone))")
      .eq("id", messageId)
      .single();

    if (msgError || !message) {
      throw new Error("Message not found");
    }

    const metadata = message.metadata as Record<string, unknown> | null;
    const evolutionMessageId =
      (message.evolution_message_id as string | undefined) ||
      (metadata?.evolution_message_id as string | undefined);
    const phone = (message as any).conversation?.contact?.phone as string | undefined;
    const fromMe = message.sender_type === "agent";

    // If we have the Evolution message id, try to delete on WhatsApp
    if (deleteForEveryone && evolutionMessageId && phone) {
      try {
        console.log(`Deleting Evolution message: ${evolutionMessageId}, fromMe: ${fromMe}`);
        const delRes = await deleteEvolutionMessage({ messageId: evolutionMessageId, phone, fromMe });
        if (!delRes.ok) {
          console.error("Evolution delete failed:", delRes.status, delRes.raw);
        } else {
          console.log("Message deleted from WhatsApp successfully");
        }
      } catch (e) {
        console.error("Evolution delete error:", e);
      }
    } else {
      console.log("No Evolution message ID/phone found, deleting only from database");
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
