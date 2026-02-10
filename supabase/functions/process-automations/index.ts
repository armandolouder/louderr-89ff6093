import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const UAZAPI_SERVER_URL = Deno.env.get("UAZAPI_SERVER_URL");
    const UAZAPI_INSTANCE_TOKEN = Deno.env.get("UAZAPI_INSTANCE_TOKEN");

    if (!UAZAPI_SERVER_URL || !UAZAPI_INSTANCE_TOKEN) {
      throw new Error("UAZAPI credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get pending executions that are due
    const { data: executions, error } = await supabase
      .from("automation_executions")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(20);

    if (error) throw error;
    if (!executions || executions.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let failed = 0;

    for (const exec of executions) {
      const triggerData = exec.trigger_data as any;
      const phone = exec.phone;
      const messageContent = triggerData.message_content || "";
      const mediaUrl = triggerData.media_url;
      const mediaType = triggerData.media_type;
      const customerName = exec.customer_name || triggerData.customer_name || phone;

      try {
        let uazapiResponse;

        if (mediaUrl && mediaType) {
          uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/send/media`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              token: UAZAPI_INSTANCE_TOKEN,
            },
            body: JSON.stringify({
              number: phone,
              type: mediaType,
              file: mediaUrl,
              text: messageContent,
            }),
          });
        } else {
          uazapiResponse = await fetch(`${UAZAPI_SERVER_URL}/send/text`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              token: UAZAPI_INSTANCE_TOKEN,
            },
            body: JSON.stringify({
              number: phone,
              text: messageContent,
            }),
          });
        }

        const responseText = await uazapiResponse.text();
        console.log(`Automation sent to ${phone}: ${uazapiResponse.status}`);

        let uazapiData;
        try {
          uazapiData = JSON.parse(responseText);
        } catch {
          uazapiData = { raw: responseText };
        }

        if (uazapiResponse.ok) {
          // Update execution status
          await supabase
            .from("automation_executions")
            .update({
              status: "sent",
              executed_at: new Date().toISOString(),
            })
            .eq("id", exec.id);

          // Register message in inbox (find or create conversation)
          try {
            console.log(`[INBOX] Starting inbox registration for ${phone}, customer: ${customerName}`);
            
            // Find existing contact by phone
            const phoneVariants = [phone, `+${phone}`, `+55${phone}`];
            let contactId: string | null = null;
            let conversationId: string | null = null;

            // Search for contact
            const { data: contacts, error: contactErr } = await supabase
              .from("contacts")
              .select("id, phone")
              .or(phoneVariants.map(p => `phone.eq.${p}`).join(","))
              .limit(1);

            console.log(`[INBOX] Contact search result: ${JSON.stringify(contacts)}, error: ${JSON.stringify(contactErr)}`);

            if (contacts && contacts.length > 0) {
              contactId = contacts[0].id;
            } else {
              // Create contact
              const { data: newContact, error: createErr } = await supabase
                .from("contacts")
                .insert({
                  name: customerName,
                  phone: phone,
                })
                .select("id")
                .single();
              
              console.log(`[INBOX] Contact created: ${JSON.stringify(newContact)}, error: ${JSON.stringify(createErr)}`);
              
              if (newContact) {
                contactId = newContact.id;
              }
            }

            console.log(`[INBOX] contactId: ${contactId}`);

            if (contactId) {
              // Find existing conversation
              const { data: convs, error: convErr } = await supabase
                .from("conversations")
                .select("id")
                .eq("contact_id", contactId)
                .eq("channel", "whatsapp")
                .limit(1);

              console.log(`[INBOX] Conversation search: ${JSON.stringify(convs)}, error: ${JSON.stringify(convErr)}`);

              if (convs && convs.length > 0) {
                conversationId = convs[0].id;
              } else {
                // Create conversation
                const { data: newConv, error: newConvErr } = await supabase
                  .from("conversations")
                  .insert({
                    contact_id: contactId,
                    channel: "whatsapp",
                    status: "open",
                    last_message: messageContent,
                    last_message_at: new Date().toISOString(),
                  })
                  .select("id")
                  .single();

                console.log(`[INBOX] Conversation created: ${JSON.stringify(newConv)}, error: ${JSON.stringify(newConvErr)}`);

                if (newConv) {
                  conversationId = newConv.id;
                }
              }

              console.log(`[INBOX] conversationId: ${conversationId}`);

              if (conversationId) {
                // Insert message
                const { error: msgErr } = await supabase.from("messages").insert({
                  conversation_id: conversationId,
                  content: messageContent,
                  sender_type: "agent",
                  message_type: mediaUrl ? mediaType : "text",
                  media_url: mediaUrl || null,
                  status: "sent",
                  metadata: {
                    uazapi_response: uazapiData,
                    automation_flow_id: exec.flow_id,
                    automation_execution_id: exec.id,
                  },
                });

                console.log(`[INBOX] Message insert error: ${JSON.stringify(msgErr)}`);

                // Update conversation last message
                await supabase
                  .from("conversations")
                  .update({
                    last_message: messageContent,
                    last_message_at: new Date().toISOString(),
                  })
                  .eq("id", conversationId);

                console.log(`[INBOX] Message registered in inbox for conversation ${conversationId}`);
              }
            }
          } catch (inboxErr: any) {
            console.error("[INBOX] Error registering in inbox:", inboxErr.message, inboxErr.stack);
            // Don't fail the execution just because inbox registration failed
          }

          processed++;
        } else {
          await supabase
            .from("automation_executions")
            .update({
              status: "failed",
              error_message: responseText.substring(0, 500),
              executed_at: new Date().toISOString(),
            })
            .eq("id", exec.id);
          failed++;
        }
      } catch (sendError: any) {
        await supabase
          .from("automation_executions")
          .update({
            status: "failed",
            error_message: sendError.message?.substring(0, 500),
            executed_at: new Date().toISOString(),
          })
          .eq("id", exec.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed, failed, total: executions.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Process automations error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
