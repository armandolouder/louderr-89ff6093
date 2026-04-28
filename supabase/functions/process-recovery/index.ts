 import { createServiceClient } from "../_shared/auth.ts";
 import { corsHeaders } from "../_shared/cors.ts";
 import { syncNewAbandonedCheckouts, checkRecoveredOrders } from "./services/checkout-sync.ts";
 import { sendWhatsappRecovery, sendEmailRecovery } from "./services/message-sender.ts";

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

        // DEDUP: Check if execution already exists for this checkout
        const { data: existingExec } = await supabase
          .from("recovery_executions")
          .select("id")
          .eq("checkout_id", checkout.id)
          .limit(1);

        if (existingExec?.length) continue; // Already has execution

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

    // 3. Process active recovery executions
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
        // Check if checkout was recovered
        if (exec.customer_phone || exec.customer_email) {
          const query = supabase.from("nuvemshop_orders").select("id").limit(1);
          if (exec.customer_phone) query.eq("customer_phone", exec.customer_phone);
          else if (exec.customer_email) query.eq("customer_email", exec.customer_email);
          
          const { data: orders } = await query;
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

        // Get flow steps
        const { data: flowData } = await supabase
          .from("recovery_flows")
          .select("steps")
          .eq("id", exec.flow_id)
          .single();

        if (!flowData?.steps) continue;

        const steps = flowData.steps as any[];
        const nextStepIndex = exec.current_step;

        if (nextStepIndex >= steps.length) {
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

        // DEDUP: Check if message already exists for this execution + step
        const { data: existingMsg } = await supabase
          .from("recovery_messages")
          .select("id, status")
          .eq("execution_id", exec.id)
          .eq("step_number", nextStepIndex)
          .limit(1);

        if (existingMsg?.length) {
          // Message already created for this step - skip
          // If it was sent successfully, advance step
          if (existingMsg[0].status === "sent") {
            await supabase.from("recovery_executions")
              .update({ current_step: nextStepIndex + 1 })
              .eq("id", exec.id);
          }
          continue;
        }

        // Check delay
        const { data: lastMsg } = await supabase
          .from("recovery_messages")
          .select("sent_at")
          .eq("execution_id", exec.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const referenceTime = lastMsg?.[0]?.sent_at || exec.created_at;
        const timeSinceRef = (now.getTime() - new Date(referenceTime).getTime()) / (1000 * 60);
        if (timeSinceRef < delayMinutes) continue;

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
        let errorDetail = "";

        if (channel === "whatsapp" && exec.customer_phone) {
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

            // AI rewrite for variant B
            if (variant === "B" && step.ab_enabled) {
              const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
              if (lovableApiKey) {
                try {
                  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                      model: "google/gemini-2.5-flash-lite",
                      messages: [
                        { role: "system", content: `Você é um copywriter da marca LOUDER.ink, uma marca de moda alternativa (dark, post-punk, streetwear). Reescreva a mensagem de recuperação de carrinho mantendo o tom da marca: provocativo, autêntico, sem ser agressivo. Mantenha as variáveis como [nome_cliente], etc. Responda APENAS com a mensagem reescrita.` },
                        { role: "user", content: `Reescreva esta mensagem (tipo: ${step.message_type || "leve"}):\n\n${messageText}` },
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

            // Send product images (max 2)
            const productsWithImages = products.filter((p: any) => p.image);
            const imagesToSend = productsWithImages.length > 2
              ? [productsWithImages.sort((a: any, b: any) => (b.price || 0) - (a.price || 0))[0]]
              : productsWithImages.slice(0, 2);

            for (const prod of imagesToSend) {
              try {
                await fetch(`${uazapiUrl}/send/media`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "token": uazapiToken },
                  body: JSON.stringify({
                    number: phone, type: "image", file: prod.image,
                    text: `${prod.name} — R$ ${Number(prod.price || 0).toFixed(2).replace(".", ",")}`,
                  }),
                });
                await new Promise(r => setTimeout(r, 1500));
              } catch (imgErr) {
                console.error("Error sending product image:", imgErr);
              }
            }

            // Send text
            const sendRes = await fetch(`${uazapiUrl}/send/text`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "token": uazapiToken },
              body: JSON.stringify({ number: phone, text: messageText }),
            });

            sendSuccess = sendRes.ok;
            if (!sendSuccess) errorDetail = `UAZAPI HTTP ${sendRes.status}: ${await sendRes.text().catch(() => "")}`;

            await supabase.from("recovery_messages")
              .update({
                content: messageText,
                status: sendSuccess ? "sent" : "failed",
                sent_at: sendSuccess ? now.toISOString() : null,
                error_message: sendSuccess ? null : errorDetail,
              })
              .eq("id", msgRecord.id);
          } else {
            errorDetail = "UAZAPI credentials not configured";
          }
        } else if (channel === "email" && exec.customer_email) {
          // Send via Brevo API directly (no function invoke)
          const brevoApiKey = Deno.env.get("BREVO_API_KEY");
          if (brevoApiKey) {
            try {
              const firstName = (exec.customer_name || "Cliente").split(" ")[0];
              const stepType = step.message_type || "emocional";
              const emailContent = buildRecoveryEmailHtml(
                stepType, firstName, (exec.cart_items as any[]) || [],
                exec.cart_value || 0, exec.recovery_url
              );

              // Get sender from Brevo
              const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
                headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
              });
              let fromEmail = "";
              if (sendersRes.ok) {
                const sendersData = await sendersRes.json();
                fromEmail = sendersData.senders?.[0]?.email || "";
              }

              if (!fromEmail) {
                errorDetail = "No Brevo sender configured";
                console.error(errorDetail);
              } else {
                const emailPayload = {
                  sender: { name: "LOUDER.ink", email: fromEmail },
                  to: [{ email: exec.customer_email }],
                  subject: emailContent.subject,
                  htmlContent: emailContent.html,
                  tags: ["recovery-engine", stepType, variant],
                };

                console.log(`Sending recovery email to ${exec.customer_email}, stepType: ${stepType}`);

                const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
                  method: "POST",
                  headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
                  body: JSON.stringify(emailPayload),
                });

                if (emailRes.ok) {
                  const result = await emailRes.json();
                  sendSuccess = true;
                  console.log(`Email sent successfully: ${result.messageId}`);
                } else {
                  errorDetail = `Brevo HTTP ${emailRes.status}: ${await emailRes.text().catch(() => "")}`;
                  console.error("Brevo send error:", errorDetail);
                }
              }

              await supabase.from("recovery_messages")
                .update({
                  subject: emailContent.subject,
                  status: sendSuccess ? "sent" : "failed",
                  sent_at: sendSuccess ? now.toISOString() : null,
                  error_message: sendSuccess ? null : errorDetail,
                })
                .eq("id", msgRecord.id);
            } catch (emailErr) {
              errorDetail = `Email error: ${emailErr.message}`;
              console.error(errorDetail);
              await supabase.from("recovery_messages")
                .update({ status: "failed", error_message: errorDetail })
                .eq("id", msgRecord.id);
            }
          } else {
            errorDetail = "BREVO_API_KEY not configured";
            console.error(errorDetail);
          }
        }

        if (sendSuccess) {
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
