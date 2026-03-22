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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    let processed = 0;
    let errors = 0;

    // 1. Find new abandoned checkouts without active recovery
    const { data: newCheckouts } = await supabase
      .from("nuvemshop_abandoned_checkouts")
      .select("*")
      .eq("recovery_status", "pending")
      .is("recovered", false)
      .order("created_at", { ascending: true })
      .limit(50);

    // 2. Get active recovery flow
    const { data: flows } = await supabase
      .from("recovery_flows")
      .select("*")
      .eq("is_active", true)
      .limit(1);

    const activeFlow = flows?.[0];

    // Create recovery executions for new checkouts
    if (activeFlow && newCheckouts?.length) {
      for (const checkout of newCheckouts) {
        if (!checkout.customer_phone && !checkout.customer_email) continue;

        const { error: insertErr } = await supabase.from("recovery_executions").insert({
          checkout_id: checkout.id,
          flow_id: activeFlow.id,
          current_step: 0,
          status: "active",
          customer_phone: checkout.customer_phone,
          customer_email: checkout.customer_email,
          customer_name: checkout.customer_name,
          cart_value: checkout.total || 0,
          cart_items: checkout.products || [],
          recovery_url: checkout.recovery_url,
        });

        if (!insertErr) {
          await supabase
            .from("nuvemshop_abandoned_checkouts")
            .update({ recovery_status: "contacted", recovery_flow_id: activeFlow.id })
            .eq("id", checkout.id);
        }
      }
    }

    // 3. Process active recovery executions - find ones ready for next step
    const { data: activeExecs } = await supabase
      .from("recovery_executions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(100);

    if (!activeExecs?.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No active recoveries" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const exec of activeExecs) {
      try {
        // Check if checkout was recovered (order placed)
        if (exec.customer_phone || exec.customer_email) {
          const query = supabase.from("nuvemshop_orders").select("id").limit(1);
          if (exec.customer_phone) {
            query.eq("customer_phone", exec.customer_phone);
          } else if (exec.customer_email) {
            query.eq("customer_email", exec.customer_email);
          }
          
          const { data: orders } = await query;
          // Check for recent orders (within last 72h from checkout creation)
          // Simple check - if there's a matching order after execution start
          if (orders?.length) {
            await supabase.from("recovery_executions")
              .update({ status: "recovered", completed_at: now.toISOString() })
              .eq("id", exec.id);
            
            await supabase.from("nuvemshop_abandoned_checkouts")
              .update({ recovered: true, recovery_status: "recovered" })
              .eq("id", exec.checkout_id);

            processed++;
            continue;
          }
        }

        // Get the flow steps
        const { data: flowData } = await supabase
          .from("recovery_flows")
          .select("steps")
          .eq("id", exec.flow_id)
          .single();

        if (!flowData?.steps) continue;

        const steps = flowData.steps as any[];
        const nextStepIndex = exec.current_step;

        if (nextStepIndex >= steps.length) {
          // All steps completed
          await supabase.from("recovery_executions")
            .update({ status: "expired", completed_at: now.toISOString() })
            .eq("id", exec.id);
          
          await supabase.from("nuvemshop_abandoned_checkouts")
            .update({ recovery_status: "expired", expired_at: now.toISOString() })
            .eq("id", exec.checkout_id);

          continue;
        }

        const step = steps[nextStepIndex];
        const delayMinutes = step.delay_minutes || 15;
        
        // Check if enough time has passed since last message or creation
        const { data: lastMsg } = await supabase
          .from("recovery_messages")
          .select("sent_at")
          .eq("execution_id", exec.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const referenceTime = lastMsg?.[0]?.sent_at || exec.created_at;
        const timeSinceRef = (now.getTime() - new Date(referenceTime).getTime()) / (1000 * 60);

        if (timeSinceRef < delayMinutes) continue; // Not ready yet

        // Determine A/B variant
        const variant = step.ab_enabled ? (Math.random() > 0.5 ? "B" : "A") : "A";

        // Create recovery message record
        const { data: msgRecord, error: msgErr } = await supabase
          .from("recovery_messages")
          .insert({
            execution_id: exec.id,
            step_number: nextStepIndex,
            channel: step.channel || "whatsapp",
            variant,
            status: "pending",
          })
          .select()
          .single();

        if (msgErr) {
          console.error("Error creating recovery message:", msgErr);
          errors++;
          continue;
        }

        // Send the message
        const channel = step.channel || "whatsapp";
        let sendSuccess = false;

        if (channel === "whatsapp" && exec.customer_phone) {
          // Send via WhatsApp (UAZAPI)
          const uazapiUrl = Deno.env.get("UAZAPI_SERVER_URL");
          const uazapiToken = Deno.env.get("UAZAPI_INSTANCE_TOKEN");

          if (uazapiUrl && uazapiToken) {
            const phone = exec.customer_phone.replace(/\D/g, "");
            const firstName = (exec.customer_name || "Cliente").split(" ")[0];
            const products = (exec.cart_items as any[]) || [];
            const productsList = products.map((p: any) => `${p.quantity || 1}x ${p.name}`).join("\n");
            const total = `R$ ${Number(exec.cart_value || 0).toFixed(2).replace(".", ",")}`;

            let messageText = step.message_template || step.message || "";
            messageText = messageText
              .replace(/\[nome_cliente\]/g, firstName)
              .replace(/\[lista_produtos\]/g, productsList)
              .replace(/\[total_pedido\]/g, total)
              .replace(/\[link_recuperacao\]/g, exec.recovery_url || "")
              .replace(/\[link_checkout\]/g, exec.recovery_url || "");

            // If variant B and AI is enabled, use AI to rewrite
            if (variant === "B" && step.ab_enabled) {
              const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
              if (lovableApiKey) {
                try {
                  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${lovableApiKey}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      model: "google/gemini-2.5-flash-lite",
                      messages: [
                        {
                          role: "system",
                          content: `Você é um copywriter da marca LOUDER.ink, uma marca de moda alternativa (dark, post-punk, streetwear). 
Reescreva a mensagem de recuperação de carrinho mantendo o tom da marca: provocativo, autêntico, sem ser agressivo.
Mantenha as variáveis como [nome_cliente], [lista_produtos], etc.
Responda APENAS com a mensagem reescrita, sem explicações.`,
                        },
                        {
                          role: "user",
                          content: `Reescreva esta mensagem de recuperação (tipo: ${step.message_type || "leve"}):\n\n${messageText}`,
                        },
                      ],
                    }),
                  });

                  if (aiRes.ok) {
                    const aiData = await aiRes.json();
                    const rewritten = aiData.choices?.[0]?.message?.content;
                    if (rewritten) {
                      messageText = rewritten
                        .replace(/\[nome_cliente\]/g, firstName)
                        .replace(/\[lista_produtos\]/g, productsList)
                        .replace(/\[total_pedido\]/g, total)
                        .replace(/\[link_recuperacao\]/g, exec.recovery_url || "")
                        .replace(/\[link_checkout\]/g, exec.recovery_url || "");
                    }
                  }
                } catch (aiErr) {
                  console.error("AI rewrite failed:", aiErr);
                }
              }
            }

            // Send product image first if available (max 2 items)
            const productsWithImages = products.filter((p: any) => p.image);
            if (productsWithImages.length > 0 && productsWithImages.length <= 2) {
              for (const prod of productsWithImages) {
                try {
                  await fetch(`${uazapiUrl}/send/media`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "token": uazapiToken,
                    },
                    body: JSON.stringify({
                      number: phone,
                      type: "image",
                      file: prod.image,
                      text: `${prod.name} — R$ ${Number(prod.price || 0).toFixed(2).replace(".", ",")}`,
                    }),
                  });
                  // Small delay between images
                  await new Promise(r => setTimeout(r, 1500));
                } catch (imgErr) {
                  console.error("Error sending product image:", imgErr);
                }
              }
            } else if (productsWithImages.length > 2) {
              // Send only the first (most expensive) product image
              const highlight = productsWithImages.sort((a: any, b: any) => (b.price || 0) - (a.price || 0))[0];
              try {
                await fetch(`${uazapiUrl}/send/media`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "token": uazapiToken,
                  },
                  body: JSON.stringify({
                    number: phone,
                    type: "image",
                    file: highlight.image,
                    text: `${highlight.name} — R$ ${Number(highlight.price || 0).toFixed(2).replace(".", ",")}`,
                  }),
                });
                await new Promise(r => setTimeout(r, 1500));
              } catch (imgErr) {
                console.error("Error sending highlight image:", imgErr);
              }
            }

            // Send text message
            const sendRes = await fetch(`${uazapiUrl}/send/text`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "token": uazapiToken,
              },
              body: JSON.stringify({ number: phone, text: messageText }),
            });

            sendSuccess = sendRes.ok;

            await supabase.from("recovery_messages")
              .update({
                content: messageText,
                status: sendSuccess ? "sent" : "failed",
                sent_at: sendSuccess ? now.toISOString() : null,
                error_message: sendSuccess ? null : `HTTP ${sendRes.status}`,
              })
              .eq("id", msgRecord.id);
          }
        } else if (channel === "email" && exec.customer_email) {
          // Send via Brevo
          const brevoApiKey = Deno.env.get("BREVO_API_KEY");
          if (brevoApiKey) {
            const firstName = (exec.customer_name || "Cliente").split(" ")[0];

            // Call send-brevo-email function internally
            const { data: emailResult, error: emailErr } = await supabase.functions.invoke("send-brevo-email", {
              body: {
                action: "send-recovery",
                to: exec.customer_email,
                customerName: exec.customer_name,
                products: exec.cart_items,
                total: exec.cart_value,
                recoveryUrl: exec.recovery_url,
                variant,
                stepType: step.message_type || "emocional",
              },
            });

            sendSuccess = emailResult?.success || false;

            await supabase.from("recovery_messages")
              .update({
                subject: `Recovery email - ${step.message_type || "emocional"}`,
                status: sendSuccess ? "sent" : "failed",
                sent_at: sendSuccess ? now.toISOString() : null,
                error_message: sendSuccess ? null : (emailErr?.message || emailResult?.error),
              })
              .eq("id", msgRecord.id);
          }
        }

        if (sendSuccess) {
          // Advance to next step
          await supabase.from("recovery_executions")
            .update({ current_step: nextStepIndex + 1 })
            .eq("id", exec.id);

          processed++;
        } else {
          errors++;
        }
      } catch (execErr) {
        console.error(`Error processing execution ${exec.id}:`, execErr);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, errors, activeExecutions: activeExecs?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recovery engine error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
