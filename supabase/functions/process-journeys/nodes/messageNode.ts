import { sendWhatsAppText, hasWhatsAppCredentials } from "../../_shared/whatsapp.ts";
import { replaceWhatsappVariables } from "../../_shared/variables.ts";
import { digitsOnly } from "../../_shared/phone.ts";
import { resolveCustomerEmail } from "../customerResolver.ts";
import { sendJourneyEmail } from "../emailSender.ts";
import { NodeExecutionContext, NodeExecutor, NodeResult } from "./types.ts";
import { registerInInbox } from "../../_shared/inbox-registry.ts";

const MAX_EMAIL_WAITS = 30; // ~1 hour @ 2 min interval
const EMAIL_RETRY_INTERVAL_MS = 2 * 60 * 1000;

export class MessageNodeExecutor implements NodeExecutor {
  async execute(ctx: NodeExecutionContext): Promise<NodeResult> {
    const { supabase, exec, currentNode, journey, metrics } = ctx;
    const nodeData = currentNode.data;
    const execData = (exec.execution_data ?? {}) as any;
    const sentNodes: string[] = execData?.sent_nodes || [];

    // Deduplication: skip if already sent
    if (sentNodes.includes(currentNode.id)) {
      return { handled: false };
    }

    const channel = nodeData.channel || "email";

    // Resolve customer identity
    const resolved = await resolveCustomerEmail(supabase, exec);
    const customerEmail = resolved.email;
    const customerName = resolved.name || exec.customer_name;

    if (resolved.email && !exec.customer_email) {
      await supabase
        .from("journey_executions")
        .update({ customer_email: resolved.email, customer_name: customerName })
        .eq("id", exec.id);
    }

    // Process email channel
    const emailRequired = (channel === "email" || channel === "both") && nodeData.templateId;
    if (emailRequired) {
      const emailOutcome = await this.handleEmail(
        ctx,
        execData,
        customerEmail,
        customerName
      );
      if (emailOutcome.shouldWait) {
        metrics.emailsSkipped++;
        return { handled: true };
      }
      if (emailOutcome.sent) metrics.emailsSent++;
      if (emailOutcome.skipped) metrics.emailsSkipped++;
    }

    // Process WhatsApp channel
    if ((channel === "whatsapp" || channel === "both") && exec.customer_phone) {
      await this.handleWhatsApp(ctx, customerName);
    }

    return {
      handled: false,
      extraData: {
        execution_data: { ...execData, sent_nodes: [...sentNodes, currentNode.id] },
      },
    };
  }

  private async handleEmail(
    ctx: NodeExecutionContext,
    execData: any,
    customerEmail: string | null,
    customerName: string | null
  ): Promise<{ sent?: boolean; skipped?: boolean; shouldWait?: boolean }> {
    const { supabase, exec, currentNode, journey } = ctx;
    const nodeData = currentNode.data;

    // No email yet → schedule retry, don't advance
    if (!customerEmail) {
      const waitCount = (execData?.email_wait_count || 0) + 1;
      if (waitCount >= MAX_EMAIL_WAITS) {
        console.warn(
          `Journey ${journey.id}: No email after ${MAX_EMAIL_WAITS} retries for visitor ${exec.customer_phone}, skipping`
        );
        // Force advance: caller will continue
        return { skipped: true };
      }

      console.log(
        `Journey ${journey.id}: No email for visitor ${exec.customer_phone}, waiting (${waitCount}/${MAX_EMAIL_WAITS})`
      );
      await supabase
        .from("journey_executions")
        .update({
          next_action_at: new Date(Date.now() + EMAIL_RETRY_INTERVAL_MS).toISOString(),
          execution_data: { ...execData, email_wait_count: waitCount },
          status: "active",
        })
        .eq("id", exec.id);
      return { shouldWait: true, skipped: true };
    }

    // Have email → fetch template and send
    try {
      const { data: template } = await supabase
        .from("email_templates")
        .select("subject, html_content")
        .eq("id", nodeData.templateId)
        .eq("is_active", true)
        .maybeSingle();

      if (!template) {
        console.warn(`Template ${nodeData.templateId} not found or inactive`);
        return {};
      }

      const firstName = (customerName || "").split(" ")[0] || "Cliente";
      const html = template.html_content.replace(/\{\{nome\}\}/gi, firstName);
      const subject = template.subject.replace(/\{\{nome\}\}/gi, firstName);

      const result = await sendJourneyEmail({
        to: customerEmail,
        subject,
        htmlContent: html,
        customerName: customerName || undefined,
      });

      if (result.success) {
        console.log(`Journey email sent to ${customerEmail} (messageId: ${result.messageId})`);
        return { sent: true };
      }
      console.error(`Journey email failed for ${customerEmail}: ${result.error}`);
      return {};
    } catch (emailErr: any) {
      console.error("Email send error:", emailErr.message);
      return {};
    }
  }

  private async handleWhatsApp(
    ctx: NodeExecutionContext,
    customerName: string | null
  ): Promise<void> {
    const { supabase, exec, currentNode } = ctx;
    const nodeData = currentNode.data;

    if (!hasWhatsAppCredentials()) {
      console.warn("WhatsApp credentials not configured, skipping WhatsApp");
      return;
    }

    try {
      let waContent = "";
      if (nodeData.waTemplateId) {
        const { data: flow } = await supabase
          .from("automation_flows")
          .select("message_content, media_url, media_type")
          .eq("id", nodeData.waTemplateId)
          .single();
        if (flow) waContent = flow.message_content || "";
      }
      if (!waContent && nodeData.messageContent) {
        waContent = nodeData.messageContent;
      }
      if (!waContent) return;

      const execDataObj = (exec.execution_data ?? {}) as any;
      waContent = replaceWhatsappVariables(waContent, {
        customerName,
        orderNumber: execDataObj.order_number,
        total: execDataObj.total,
        products: execDataObj.products,
        checkoutSuccessUrl: execDataObj.checkout_success_url,
        checkoutUrl: execDataObj.checkout_url || execDataObj.recovery_url,
        recoveryUrl: execDataObj.recovery_url,
        boletoUrl: execDataObj.boleto_url,
        trackingCode: execDataObj.tracking_code,
      });

      const formattedPhone = digitsOnly(exec.customer_phone);
      console.log(`Journey WhatsApp: Sending to ${formattedPhone}`);
      const uazResult = await sendWhatsAppText(formattedPhone, waContent);
      if (uazResult.ok) {
        console.log(`Journey WhatsApp sent to ${formattedPhone}: ${uazResult.raw.substring(0, 100)}`);
        registerInInbox(supabase, {
          phone: formattedPhone,
          customerName: customerName || exec.customer_name || "Cliente",
          messageContent: waContent,
          uazapiData: uazResult,
          userId: exec.user_id,
          source: "journey",
        }).catch(err => console.error("Inbox register (journey) failed:", err));
      } else {
        console.error(
          `Journey WhatsApp failed for ${formattedPhone}: ${uazResult.status} ${uazResult.raw}`
        );
      }
    } catch (waErr: any) {
      console.error("WhatsApp send error:", waErr.message);
    }
  }
}