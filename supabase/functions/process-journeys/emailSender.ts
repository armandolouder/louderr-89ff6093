// Send email directly via Brevo API (no auth needed, server-to-server)
export async function sendJourneyEmail(options: {
  to: string;
  subject: string;
  htmlContent: string;
  customerName?: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoApiKey) return { success: false, error: "BREVO_API_KEY not configured" };

  try {
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