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
    const NUVEMSHOP_ACCESS_TOKEN = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN");
    const NUVEMSHOP_STORE_ID = Deno.env.get("NUVEMSHOP_STORE_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!NUVEMSHOP_ACCESS_TOKEN || !NUVEMSHOP_STORE_ID) {
      throw new Error("Nuvemshop credentials not configured");
    }

    const webhookUrl = `${SUPABASE_URL}/functions/v1/nuvemshop-webhook`;

    const events = [
      "order/created",
      "order/paid",
      "order/packed",
      "order/fulfilled",
      "order/cancelled",
    ];

    // First, list existing webhooks to avoid duplicates
    const listRes = await fetch(
      `https://api.tiendanube.com/v1/${NUVEMSHOP_STORE_ID}/webhooks`,
      {
        headers: {
          "Authentication": `bearer ${NUVEMSHOP_ACCESS_TOKEN}`,
          "User-Agent": "LOUDER.ink (contato@louder.ink)",
          "Content-Type": "application/json",
        },
      }
    );

    const existingWebhooks = listRes.ok ? await listRes.json() : [];
    console.log(`Found ${existingWebhooks.length} existing webhooks`);

    const results: any[] = [];

    for (const event of events) {
      // Check if webhook already exists for this event
      const existing = existingWebhooks.find(
        (w: any) => w.event === event && w.url === webhookUrl
      );

      if (existing) {
        results.push({ event, status: "already_exists", id: existing.id });
        continue;
      }

      const res = await fetch(
        `https://api.tiendanube.com/v1/${NUVEMSHOP_STORE_ID}/webhooks`,
        {
          method: "POST",
          headers: {
            "Authentication": `bearer ${NUVEMSHOP_ACCESS_TOKEN}`,
            "User-Agent": "LOUDER.ink (contato@louder.ink)",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event,
            url: webhookUrl,
          }),
        }
      );

      const data = await res.json();
      console.log(`Webhook ${event}: ${res.status}`, JSON.stringify(data));

      results.push({
        event,
        status: res.ok ? "created" : "error",
        data,
      });
    }

    return new Response(
      JSON.stringify({ success: true, webhookUrl, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Register webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
