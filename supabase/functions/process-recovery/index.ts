 import { createServiceClient } from "../_shared/auth.ts";
 import { corsHeaders } from "../_shared/cors.ts";
 import { syncNewAbandonedCheckouts, checkRecoveredOrders } from "./services/checkout-sync.ts";
 import { sendWhatsappRecovery, sendEmailRecovery } from "./services/message-sender.ts";

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
