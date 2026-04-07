import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

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
              console.log(`Geo resolved: ${geoState}, ${geoCity}, ${geoCountry}`);
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
