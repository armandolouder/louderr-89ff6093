import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Send email directly via Brevo API (no auth needed, server-to-server)
async function sendJourneyEmail(options: {
  to: string;
  subject: string;
  htmlContent: string;
  customerName?: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoApiKey) return { success: false, error: "BREVO_API_KEY not configured" };

  try {
    // Get sender
    const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
      headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
    });
    if (!sendersRes.ok) {
      const t = await sendersRes.text();
      return { success: false, error: `Senders error: ${t}` };
    }
    const sendersData = await sendersRes.json();
    const fromEmail = sendersData.senders?.[0]?.email;
    if (!fromEmail) return { success: false, error: "No sender configured" };

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "LOUDER.ink", email: fromEmail },
        to: [{ email: options.to, name: options.customerName || undefined }],
        subject: options.subject,
        htmlContent: options.htmlContent,
        tags: ["journey-engine"],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: errText };
    }
    const result = await res.json();
    return { success: true, messageId: result.messageId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Try to resolve email from imported_customers by phone/visitor_id
async function resolveCustomerEmail(
  supabase: any,
  exec: any
): Promise<{ email: string | null; name: string | null }> {
  // Already has email
  if (exec.customer_email) return { email: exec.customer_email, name: exec.customer_name };

  const phone = exec.customer_phone;
  if (!phone) return { email: null, name: null };

  // Try matching by phone in imported_customers
  const { data: customer } = await supabase
    .from("imported_customers")
    .select("email, name, phone")
    .or(`phone.eq.${phone},phone.ilike.%${phone.slice(-8)}`)
    .not("email", "is", null)
    .limit(1)
    .maybeSingle();

  if (customer?.email) {
    return { email: customer.email, name: customer.name || exec.customer_name };
  }

  // Try matching by phone in contacts
  const { data: contact } = await supabase
    .from("contacts")
    .select("email, name, phone")
    .or(`phone.eq.${phone},phone.ilike.%${phone.slice(-8)}`)
    .not("email", "is", null)
    .limit(1)
    .maybeSingle();

  if (contact?.email) {
    return { email: contact.email, name: contact.name || exec.customer_name };
  }

  return { email: null, name: exec.customer_name };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch all active journeys
    const { data: journeys, error: jErr } = await supabase
      .from("customer_journeys")
      .select("*")
      .eq("is_active", true)
      .eq("status", "active");

    if (jErr) throw jErr;
    if (!journeys || journeys.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No active journeys" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch pending executions that are due
    const { data: executions, error: eErr } = await supabase
      .from("journey_executions")
      .select("*")
      .eq("status", "active")
      .lte("next_action_at", new Date().toISOString());

    if (eErr) throw eErr;

    let processed = 0;
    let errors = 0;
    let emailsSent = 0;
    let emailsSkipped = 0;

    for (const exec of executions || []) {
      try {
        const journey = journeys.find((j: any) => j.id === exec.journey_id);
        if (!journey) {
          await supabase
            .from("journey_executions")
            .update({ status: "error", error_message: "Journey not found" })
            .eq("id", exec.id);
          continue;
        }

        const nodes = journey.nodes as any[];
        const edges = journey.edges as any[];
        const currentNodeId = exec.current_node_id;

        if (!currentNodeId) {
          // Find first node after trigger
          const triggerNode = nodes.find((n: any) => n.type === "trigger");
          if (!triggerNode) {
            await supabase
              .from("journey_executions")
              .update({ status: "error", error_message: "No trigger node" })
              .eq("id", exec.id);
            continue;
          }

          const firstEdge = edges.find((e: any) => e.source === triggerNode.id);
          if (!firstEdge) {
            await supabase
              .from("journey_executions")
              .update({ status: "completed", completed_at: new Date().toISOString() })
              .eq("id", exec.id);
            continue;
          }

          // Set to first node after trigger
          await supabase
            .from("journey_executions")
            .update({
              current_node_id: firstEdge.target,
              next_action_at: new Date().toISOString(),
            })
            .eq("id", exec.id);
          processed++;
          continue;
        }

        const currentNode = nodes.find((n: any) => n.id === currentNodeId);
        if (!currentNode) {
          await supabase
            .from("journey_executions")
            .update({ status: "error", error_message: `Node ${currentNodeId} not found` })
            .eq("id", exec.id);
          continue;
        }

        // Check kill conditions
        const killConditions = journey.kill_conditions as string[];
        if (killConditions && killConditions.length > 0) {
          const customerPhone = exec.customer_phone;
          const customerEmail = exec.customer_email;

          if (killConditions.includes("purchase") && customerPhone) {
            const { data: orders } = await supabase
              .from("nuvemshop_orders")
              .select("id")
              .or(`customer_phone.eq.${customerPhone},customer_email.eq.${customerEmail || ""}`)
              .gte("created_at", exec.started_at)
              .limit(1);

            if (orders && orders.length > 0) {
              await supabase
                .from("journey_executions")
                .update({ status: "completed", completed_at: new Date().toISOString(), error_message: "Kill condition: purchase detected" })
                .eq("id", exec.id);
              continue;
            }
          }
        }

        // Process current node
        const nodeData = currentNode.data;

        if (currentNode.type === "message") {
          // DEDUPLICATION: Check if we already sent for this node
          const execData = exec.execution_data as any;
          const sentNodes = execData?.sent_nodes || [];

          if (sentNodes.includes(currentNodeId)) {
            const nextEdge = edges.find((e: any) => e.source === currentNodeId);
            if (nextEdge) {
              await supabase
                .from("journey_executions")
                .update({ current_node_id: nextEdge.target, next_action_at: new Date().toISOString() })
                .eq("id", exec.id);
            } else {
              await supabase
                .from("journey_executions")
                .update({ status: "completed", completed_at: new Date().toISOString() })
                .eq("id", exec.id);
            }
            continue;
          }

          const channel = nodeData.channel || "email";

          // Resolve customer email if needed
          const resolved = await resolveCustomerEmail(supabase, exec);
          const customerEmail = resolved.email;
          const customerName = resolved.name || exec.customer_name;

          // Update execution with resolved email if found
          if (resolved.email && !exec.customer_email) {
            await supabase
              .from("journey_executions")
              .update({ customer_email: resolved.email, customer_name: customerName })
              .eq("id", exec.id);
          }

          // Send email
          let emailRequired = (channel === "email" || channel === "both") && nodeData.templateId;
          let emailSentOk = false;

          if (emailRequired) {
            if (!customerEmail) {
              // PAUSE: Don't advance past email node if no email yet — retry in 2 min
              const waitCount = (execData?.email_wait_count || 0) + 1;
              const maxWaits = 30; // ~1 hour of retries (30 x 2min)
              
              if (waitCount >= maxWaits) {
                console.warn(`Journey ${journey.id}: No email after ${maxWaits} retries for visitor ${exec.customer_phone}, skipping`);
                emailsSkipped++;
                // Force advance after max waits
                emailSentOk = true;
              } else {
                console.log(`Journey ${journey.id}: No email for visitor ${exec.customer_phone}, waiting (attempt ${waitCount}/${maxWaits})`);
                await supabase
                  .from("journey_executions")
                  .update({
                    next_action_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
                    execution_data: { ...execData, email_wait_count: waitCount },
                  })
                  .eq("id", exec.id);
                emailsSkipped++;
                processed++;
                continue; // Don't advance — wait for email to be captured
              }
            } else {
              try {
                const { data: template } = await supabase
                  .from("email_templates")
                  .select("subject, html_content")
                  .eq("id", nodeData.templateId)
                  .eq("is_active", true)
                  .maybeSingle();

                if (template) {
                  const firstName = (customerName || "").split(" ")[0] || "Cliente";
                  let html = template.html_content;
                  let subject = template.subject;
                  html = html.replace(/\{\{nome\}\}/gi, firstName);
                  subject = subject.replace(/\{\{nome\}\}/gi, firstName);

                  const result = await sendJourneyEmail({
                    to: customerEmail,
                    subject,
                    htmlContent: html,
                    customerName,
                  });

                  if (result.success) {
                    console.log(`Journey email sent to ${customerEmail} (messageId: ${result.messageId})`);
                    emailsSent++;
                    emailSentOk = true;
                  } else {
                    console.error(`Journey email failed for ${customerEmail}: ${result.error}`);
                    emailSentOk = true; // advance anyway on send failure
                  }
                } else {
                  console.warn(`Template ${nodeData.templateId} not found or inactive`);
                  emailSentOk = true;
                }
              } catch (emailErr: any) {
                console.error("Email send error:", emailErr.message);
                emailSentOk = true;
              }
            }
          } else {
            emailSentOk = true; // no email required, can advance
          }

          // Send WhatsApp
          if ((channel === "whatsapp" || channel === "both") && nodeData.waTemplateId && exec.customer_phone) {
            try {
              const { data: flow } = await supabase
                .from("automation_flows")
                .select("message_content, media_url, media_type")
                .eq("id", nodeData.waTemplateId)
                .single();

              if (flow) {
                let content = flow.message_content || "";
                content = content.replace(/\[nome_cliente\]/g, customerName?.split(" ")[0] || "");

                await supabase.functions.invoke("send-whatsapp", {
                  body: {
                    phone: exec.customer_phone,
                    message: content,
                    mediaUrl: flow.media_url,
                    userId: exec.user_id,
                  },
                });
              }
            } catch (waErr: any) {
              console.error("WhatsApp send error:", waErr.message);
            }
          }

          // Mark node as sent
          const updatedSentNodes = [...sentNodes, currentNodeId];
          const nextEdge = edges.find((e: any) => e.source === currentNodeId);

          if (nextEdge) {
            await supabase
              .from("journey_executions")
              .update({
                current_node_id: nextEdge.target,
                next_action_at: new Date().toISOString(),
                execution_data: { ...execData, sent_nodes: updatedSentNodes },
              })
              .eq("id", exec.id);
          } else {
            await supabase
              .from("journey_executions")
              .update({
                status: "completed",
                completed_at: new Date().toISOString(),
                execution_data: { ...execData, sent_nodes: updatedSentNodes },
              })
              .eq("id", exec.id);
          }
        } else if (currentNode.type === "delay") {
          const delayValue = nodeData.delayValue || 1;
          const delayUnit = nodeData.delayUnit || "hours";

          let delayMs = delayValue * 60 * 1000;
          if (delayUnit === "hours") delayMs = delayValue * 60 * 60 * 1000;
          if (delayUnit === "days") delayMs = delayValue * 24 * 60 * 60 * 1000;

          const nextEdge = edges.find((e: any) => e.source === currentNodeId);
          if (nextEdge) {
            await supabase
              .from("journey_executions")
              .update({
                current_node_id: nextEdge.target,
                next_action_at: new Date(Date.now() + delayMs).toISOString(),
              })
              .eq("id", exec.id);
          } else {
            await supabase
              .from("journey_executions")
              .update({ status: "completed", completed_at: new Date().toISOString() })
              .eq("id", exec.id);
          }
        } else if (currentNode.type === "end") {
          await supabase
            .from("journey_executions")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", exec.id);
        } else {
          const nextEdge = edges.find((e: any) => e.source === currentNodeId);
          if (nextEdge) {
            await supabase
              .from("journey_executions")
              .update({ current_node_id: nextEdge.target, next_action_at: new Date().toISOString() })
              .eq("id", exec.id);
          } else {
            await supabase
              .from("journey_executions")
              .update({ status: "completed", completed_at: new Date().toISOString() })
              .eq("id", exec.id);
          }
        }

        processed++;
      } catch (execErr: any) {
        console.error(`Error processing execution ${exec.id}:`, execErr.message);
        await supabase
          .from("journey_executions")
          .update({ status: "error", error_message: execErr.message })
          .eq("id", exec.id);
        errors++;
      }
    }

    // 3. Update execution counts on journeys
    for (const journey of journeys) {
      const { count } = await supabase
        .from("journey_executions")
        .select("id", { count: "exact", head: true })
        .eq("journey_id", journey.id);

      await supabase
        .from("customer_journeys")
        .update({ execution_count: count || 0, last_executed_at: new Date().toISOString() })
        .eq("id", journey.id);
    }

    return new Response(
      JSON.stringify({ processed, errors, emailsSent, emailsSkipped, total_executions: executions?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("process-journeys error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
