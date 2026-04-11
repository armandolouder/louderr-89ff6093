import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
          // Check if customer has completed a kill-condition event
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
          const dedupKey = `${exec.id}_${currentNodeId}`;
          const execData = exec.execution_data as any;
          const sentNodes = execData?.sent_nodes || [];

          if (sentNodes.includes(currentNodeId)) {
            // Already sent, skip to next node
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

          // Send email
          if ((channel === "email" || channel === "both") && nodeData.templateId) {
            try {
              await supabase.functions.invoke("send-brevo-email", {
                body: {
                  templateId: nodeData.templateId,
                  to: exec.customer_email,
                  customerName: exec.customer_name,
                  userId: exec.user_id,
                },
              });
            } catch (emailErr: any) {
              console.error("Email send error:", emailErr.message);
            }
          }

          // Send WhatsApp
          if ((channel === "whatsapp" || channel === "both") && nodeData.waTemplateId && exec.customer_phone) {
            try {
              // Fetch the automation flow template
              const { data: flow } = await supabase
                .from("automation_flows")
                .select("message_content, media_url, media_type")
                .eq("id", nodeData.waTemplateId)
                .single();

              if (flow) {
                let content = flow.message_content || "";
                content = content.replace(/\[nome_cliente\]/g, exec.customer_name?.split(" ")[0] || "");

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
          // Calculate delay and set next_action_at
          const delayValue = nodeData.delayValue || 1;
          const delayUnit = nodeData.delayUnit || "hours";

          let delayMs = delayValue * 60 * 1000; // default minutes
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
          // Unknown node type, skip to next
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
      JSON.stringify({ processed, errors, total_executions: executions?.length || 0 }),
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
