import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const { phone, content, mediaUrl } = await req.json();

    if (!phone || !content) {
      throw new Error("phone and content are required");
    }

    // Auto-format phone
    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.length >= 10 && !formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    console.log(`Sending individual message to ${formattedPhone}, hasMedia: ${!!mediaUrl}`);

    let uazapiResponse;

    if (mediaUrl) {
      uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/send/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_INSTANCE_TOKEN,
        },
        body: JSON.stringify({
          number: formattedPhone,
          type: "image",
          file: mediaUrl,
          text: content,
        }),
      });
    } else {
      uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/send/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_INSTANCE_TOKEN,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: content,
        }),
      });
    }

    const responseText = await uazapiResponse.text();
    console.log("UAZAPI response status:", uazapiResponse.status);
    console.log("UAZAPI response:", responseText);

    if (!uazapiResponse.ok) {
      throw new Error(`UAZAPI error: ${uazapiResponse.status} - ${responseText}`);
    }

    let uazapiData;
    try {
      uazapiData = JSON.parse(responseText);
    } catch {
      uazapiData = { raw: responseText };
    }

    // --- Save message to database so it appears in Inbox ---

    // Find or create contact by phone (try multiple variants)
    const phoneVariants = [formattedPhone, formattedPhone.replace(/^55/, "")];
    let contact = null;

    for (const variant of phoneVariants) {
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("phone", variant)
        .maybeSingle();
      if (data) {
        contact = data;
        break;
      }
    }

    // Also try with + prefix
    if (!contact) {
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("phone", "+" + formattedPhone)
        .maybeSingle();
      if (data) contact = data;
    }

    if (!contact) {
      // Create new contact
      const { data: newContact, error: contactErr } = await supabase
        .from("contacts")
        .insert({
          name: formattedPhone,
          phone: formattedPhone,
        })
        .select()
        .single();
      if (contactErr) {
        console.error("Error creating contact:", contactErr);
      } else {
        contact = newContact;
      }
    }

    if (contact) {
      // Find or create conversation
      let conversation = null;
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("*")
        .eq("contact_id", contact.id)
        .eq("channel", "whatsapp")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from("conversations")
          .insert({
            contact_id: contact.id,
            channel: "whatsapp",
            status: "novo",
            last_message: content,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (convErr) {
          console.error("Error creating conversation:", convErr);
        } else {
          conversation = newConv;
        }
      }

      if (conversation) {
        // Save message
        const messageType = mediaUrl ? "image" : "text";
        const { error: msgErr } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversation.id,
            content,
            sender_type: "agent",
            message_type: messageType,
            media_url: mediaUrl || null,
            status: "sent",
            metadata: {
              uazapi_response: uazapiData,
              source: "individual_send",
              whatsapp_message_id: uazapiData?.messageid || null,
            },
          });

        if (msgErr) {
          console.error("Error saving message:", msgErr);
        }

        // Update conversation last message
        await supabase
          .from("conversations")
          .update({
            last_message: content,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", conversation.id);

        console.log(`Message saved to conversation ${conversation.id}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: uazapiData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending individual message:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
