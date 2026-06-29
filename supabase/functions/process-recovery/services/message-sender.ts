 import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { sendWhatsAppMedia, sendWhatsAppText, hasWhatsAppCredentials } from "../../_shared/whatsapp.ts";
 import { replaceWhatsappVariables } from "../../_shared/variables.ts";
 import { buildRecoveryEmailHtml } from "../utils/email-builder.ts";
import { buildRecoveryEmailHtml, applyRecoveryTemplate } from "../utils/email-builder.ts";
import { registerInInbox } from "../../_shared/inbox-registry.ts";
 
 export async function sendWhatsappRecovery(supabase: SupabaseClient, exec: any, step: any, variant: string, msgRecordId: string) {
   if (!hasWhatsAppCredentials()) return { success: false, error: "WhatsApp credentials not configured" };
 
   const phone = exec.customer_phone.replace(/\D/g, "");
   const firstName = (exec.customer_name || "Cliente").split(" ")[0];
   const products = (exec.cart_items as any[]) || [];
   const totalValue = exec.cart_value || 0;
 
   let messageText = step.message_template || step.message || "";
   
   // AI rewrite if variant B and enabled
   if (variant === "B" && step.ab_enabled) {
     const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
     if (lovableApiKey) {
       try {
         const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
           method: "POST",
           headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
           body: JSON.stringify({
             model: "google/gemini-2.0-flash-lite-preview-02-05",
             messages: [
               { role: "system", content: `Você é um copywriter da marca LOUDER.ink, uma marca de moda alternativa (dark, post-punk, streetwear). Reescreva a mensagem de recuperação de carrinho mantendo o tom da marca: provocativo, autêntico, sem ser agressivo. Mantenha as variáveis como [nome_cliente], [lista_produtos], [total_pedido], [link_recuperacao]. Responda APENAS com a mensagem reescrita.` },
               { role: "user", content: `Reescreva esta mensagem (tipo: ${step.message_type || "leve"}):\n\n${messageText}` },
             ],
           }),
         });
         if (aiRes.ok) {
           const aiData = await aiRes.json();
           messageText = aiData.choices?.[0]?.message?.content || messageText;
         }
       } catch (aiErr) {
         console.error("AI rewrite failed:", aiErr);
       }
     }
   }
 
   // Replace variables
   messageText = replaceWhatsappVariables(messageText, {
     customerName: exec.customer_name,
     total: totalValue,
     products: products,
     checkoutUrl: exec.recovery_url
   });
 
   // Send product images (max 2)
   const productsWithImages = products.filter((p: any) => p.image);
   const imagesToSend = productsWithImages.length > 2
     ? [productsWithImages.sort((a: any, b: any) => (b.price || 0) - (a.price || 0))[0]]
     : productsWithImages.slice(0, 2);
 
   for (const prod of imagesToSend) {
     await sendWhatsAppMedia({
       phone,
       mediaType: "image",
       fileUrl: prod.image!,
       caption: `${prod.name} — R$ ${Number(prod.price || 0).toFixed(2).replace(".", ",")}`
     });
     await new Promise(r => setTimeout(r, 1000));
   }
 
   const result = await sendWhatsAppText(phone, messageText);
   
   await supabase.from("recovery_messages")
     .update({
       content: messageText,
       status: result.ok ? "sent" : "failed",
       sent_at: result.ok ? new Date().toISOString() : null,
       error_message: result.ok ? null : `WhatsApp Error: ${result.raw.substring(0, 255)}`,
     })
     .eq("id", msgRecordId);
 
  if (result.ok) {
    registerInInbox(supabase, {
      phone,
      customerName: exec.customer_name || "Cliente",
      messageContent: messageText,
      uazapiData: result,
      userId: exec.user_id,
      source: "recovery",
    }).catch(err => console.error("Inbox register (recovery) failed:", err));
  }

   return { success: result.ok, error: result.ok ? null : result.raw };
 }
 
 export async function sendEmailRecovery(supabase: SupabaseClient, exec: any, step: any, variant: string, msgRecordId: string) {
   const brevoApiKey = Deno.env.get("BREVO_API_KEY");
   if (!brevoApiKey) return { success: false, error: "BREVO_API_KEY not configured" };
 
   const firstName = (exec.customer_name || "Cliente").split(" ")[0];
   const stepType = step.message_type || "emocional";
  const products = (exec.cart_items as any[]) || [];
  const cartValue = exec.cart_value || 0;

  // Procura um template personalizado salvo no builder para este variante.
  let emailContent: { subject: string; html: string };
  const { data: customTpl } = await supabase
    .from("email_templates")
    .select("subject, html_content")
    .eq("category", "recuperacao")
    .eq("user_id", exec.user_id)
    .filter("variables->>recovery_variant", "eq", stepType)
    .limit(1)
    .maybeSingle();

  if (customTpl?.html_content) {
    emailContent = {
      subject: (customTpl.subject || "").replace(/\{\{nome\}\}/gi, firstName || "Cliente"),
      html: applyRecoveryTemplate(customTpl.html_content, firstName, products, cartValue, exec.recovery_url),
    };
  } else {
    emailContent = buildRecoveryEmailHtml(stepType, firstName, products, cartValue, exec.recovery_url);
  }
 
   try {
     // Get sender
     const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
       headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
     });
     let fromEmail = "";
     if (sendersRes.ok) {
       const sendersData = await sendersRes.json();
       fromEmail = sendersData.senders?.[0]?.email || "";
     }
 
     if (!fromEmail) return { success: false, error: "No Brevo sender configured" };
 
     const emailPayload = {
       sender: { name: "LOUDER.ink", email: fromEmail },
       to: [{ email: exec.customer_email }],
       subject: emailContent.subject,
       htmlContent: emailContent.html,
       tags: ["recovery-engine", stepType, variant],
     };
 
     const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
       method: "POST",
       headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
       body: JSON.stringify(emailPayload),
     });
 
     const sendSuccess = emailRes.ok;
     let errorDetail = "";
     if (!sendSuccess) errorDetail = `Brevo HTTP ${emailRes.status}: ${await emailRes.text()}`;
 
     await supabase.from("recovery_messages")
       .update({
         subject: emailContent.subject,
         status: sendSuccess ? "sent" : "failed",
         sent_at: sendSuccess ? new Date().toISOString() : null,
         error_message: sendSuccess ? null : errorDetail.substring(0, 255),
       })
       .eq("id", msgRecordId);
 
     return { success: sendSuccess, error: sendSuccess ? null : errorDetail };
   } catch (err: any) {
     return { success: false, error: err.message };
   }
 }