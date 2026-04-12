import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Known bot user-agent patterns
const BOT_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
  /yandexbot/i, /sogou/i, /facebot/i, /ia_archiver/i, /applebot/i,
  /twitterbot/i, /linkedinbot/i, /embedly/i, /quora link/i, /outbrain/i,
  /pinterest/i, /semrushbot/i, /ahrefsbot/i, /mj12bot/i, /dotbot/i,
  /petalbot/i, /bytespider/i, /gptbot/i, /claudebot/i, /anthropic/i,
  /headlesschrome/i, /phantomjs/i, /lighthouse/i, /pagespeed/i,
  /screaming frog/i, /nutch/i, /archive\.org_bot/i, /mediapartners-google/i,
  /adsbot-google/i, /apis-google/i, /google-inspectiontool/i,
  /chrome-lighthouse/i, /speed insights/i, /webpagetest/i,
  // Facebook/Meta crawlers (Open Graph previews)
  /facebookexternalhit/i, /facebookcatalog/i, /meta-externalagent/i,
  // WhatsApp/Telegram/Discord link previews
  /whatsapp/i, /telegrambot/i, /discordbot/i, /slackbot/i,
  // Microsoft/Bing crawlers
  /bingpreview/i, /msnbot/i, /adidxbot/i,
  // Other common crawlers
  /dataforseo/i, /zoominfobot/i, /coccocbot/i, /seznambot/i,
  /rogerbot/i, /exabot/i, /blexbot/i, /linkdexbot/i,
];

// Known data center cities (Meta, Google, Microsoft, Amazon)
const DATACENTER_CITIES = new Set([
  "prineville", "forest city", "luleå", "lulea", "clonee",
  "fort worth", "altoona", "new albany", "papillion",
  "council bluffs", "the dalles", "lenoir", "maiden",
]);

function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

function isDataCenterCity(city: string | null): boolean {
  if (!city) return false;
  return DATACENTER_CITIES.has(city.toLowerCase().trim());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check user-agent from headers first (most reliable)
    const headerUA = req.headers.get("user-agent") || "";
    if (isBot(headerUA)) {
      return new Response(JSON.stringify({ ok: true, filtered: "bot" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Also check user-agent sent from client-side script
    const clientUA = String(body.user_agent || "");
    if (isBot(clientUA)) {
      return new Response(JSON.stringify({ ok: true, filtered: "bot" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // Validate required fields
    const visitorId = String(body.visitor_id || "").trim();
    const pageUrl = String(body.page_url || "").trim();
    const shopId = String(body.shop_id || "").trim();

    if (!visitorId || !pageUrl || !shopId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: visitor_id, page_url, shop_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve owner user_id from the webhook helper (same multi-tenant pattern)
    const { data: ownerUserId, error: ownerError } = await supabase.rpc("get_webhook_owner_user_id");
    if (ownerError || !ownerUserId) {
      console.error("Could not resolve owner user_id:", ownerError);
      return new Response(
        JSON.stringify({ error: "Shop not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize and limit input lengths
    const sanitize = (val: any, maxLen = 500) => {
      if (val === null || val === undefined) return null;
      return String(val).substring(0, maxLen).trim() || null;
    };

    // Try to get visitor geolocation from IP via free API
    let geoState = sanitize(body.state, 50);
    let geoCity = sanitize(body.city, 100);
    let geoCountry = sanitize(body.country, 10) || "BR";

    // If no state/city from client, try IP geolocation
    if (!geoState) {
      try {
        const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          || req.headers.get("cf-connecting-ip")
          || req.headers.get("x-real-ip");

        if (clientIp && clientIp !== "127.0.0.1") {
          const geoResp = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,regionName,city,countryCode`, {
            signal: AbortSignal.timeout(3000),
          });
          if (geoResp.ok) {
            const geo = await geoResp.json();
            if (geo.status === "success") {
              geoState = geo.regionName || geoState;
              geoCity = geo.city || geoCity;
              geoCountry = geo.countryCode || geoCountry;
            }
          }
        }
      } catch (geoErr) {
        console.warn("Geo lookup failed (non-blocking):", geoErr);
      }
    }

    const record = {
      user_id: ownerUserId,
      visitor_id: visitorId.substring(0, 100),
      session_id: sanitize(body.session_id, 100),
      page_url: pageUrl.substring(0, 2000),
      page_title: sanitize(body.page_title, 500),
      product_id: sanitize(body.product_id, 100),
      product_name: sanitize(body.product_name, 500),
      product_price: body.product_price ? Number(body.product_price) || null : null,
      product_category: sanitize(body.product_category, 200),
      product_image_url: sanitize(body.product_image_url, 2000),
      customer_email: sanitize(body.customer_email, 320),
      customer_phone: sanitize(body.customer_phone, 30),
      customer_name: sanitize(body.customer_name, 200),
      state: geoState,
      city: geoCity,
      country: geoCountry,
      device_type: sanitize(body.device_type, 50),
      referrer: sanitize(body.referrer, 2000),
      utm_source: sanitize(body.utm_source, 200),
      utm_medium: sanitize(body.utm_medium, 200),
      utm_campaign: sanitize(body.utm_campaign, 200),
      duration_seconds: body.duration_seconds ? Math.min(Math.max(0, parseInt(body.duration_seconds) || 0), 86400) : 0,
    };

    const { error: insertError } = await supabase.from("page_views").insert(record);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to record pageview" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Journey trigger for "visit" ──
    try {
      const { data: visitJourneys } = await supabase
        .from("customer_journeys")
        .select("id")
        .eq("trigger_event", "visit")
        .eq("is_active", true)
        .eq("status", "active");

      if (visitJourneys && visitJourneys.length > 0 && visitorId) {
        for (const journey of visitJourneys) {
          // Dedup: max 1 execution per visitor per journey per 24h
          const { data: existingExec } = await supabase
            .from("journey_executions")
            .select("id")
            .eq("journey_id", journey.id)
            .eq("customer_phone", visitorId)
            .gte("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (existingExec && existingExec.length > 0) continue;

          await supabase.from("journey_executions").insert({
            journey_id: journey.id,
            customer_phone: record.customer_phone || visitorId,
            customer_email: record.customer_email,
            customer_name: record.customer_name,
            user_id: ownerUserId,
            status: "active",
            started_at: new Date().toISOString(),
            next_action_at: new Date().toISOString(),
            execution_data: { trigger_event: "visit", visitor_id: visitorId, page_url: pageUrl },
          });
          console.log(`Visit journey execution created: ${journey.id} for ${visitorId}`);
        }
      }
    } catch (journeyErr) {
      console.warn("Journey trigger error (non-blocking):", journeyErr);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Track pageview error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
