import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getNuvemshopCredentials } from "../_shared/nuvemshop.ts";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let accessToken: string, storeId: string;
    try {
      ({ accessToken, storeId } = await getNuvemshopCredentials(supabase));
    } catch (e) {
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve owner user_id for multi-tenant data isolation
    const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
    const ownerUserId = ownerData as string | null;

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("per_page") || "50");
    const createdAtMin = url.searchParams.get("created_at_min");
    const createdAtMax = url.searchParams.get("created_at_max");

    const apiBaseUrl = "https://api.tiendanube.com/v1";
    let apiUrl = `${apiBaseUrl}/${storeId}/checkouts?page=${page}&per_page=${perPage}`;
    if (createdAtMin) apiUrl += `&created_at_min=${encodeURIComponent(createdAtMin)}`;
    if (createdAtMax) apiUrl += `&created_at_max=${encodeURIComponent(createdAtMax)}`;

    const trimmedToken = accessToken.trim();
    console.log(`Fetching abandoned checkouts: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        "Authentication": `bearer ${trimmedToken}`,
        "User-Agent": "LOUDER.ink (allvisualweb@gmail.com)",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Nuvemshop API error [${response.status}]:`, errorText);
      return new Response(
        JSON.stringify({ error: `Nuvemshop API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkouts = await response.json();
    console.log(`Received ${checkouts.length} abandoned checkouts`);

    let synced = 0;
    let errors = 0;
    const newCheckoutIds: number[] = [];

    for (const checkout of checkouts) {
      const customerName =
        checkout.contact_name ||
        checkout.customer?.name ||
        `${checkout.customer?.first_name || ""} ${checkout.customer?.last_name || ""}`.trim() ||
        checkout.billing_name ||
        null;

      const customerEmail = checkout.contact_email || checkout.customer?.email || null;
      const customerPhone = checkout.contact_phone || checkout.customer?.phone || checkout.billing_phone || null;

      const products = (checkout.products || []).map((p: any) => ({
        id: p.product_id,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        image: p.image?.src || null,
      }));

      const total = checkout.total ? parseFloat(checkout.total) : 0;

      // Check if this checkout already exists
      const { data: existing } = await supabase
        .from("nuvemshop_abandoned_checkouts")
        .select("id, contacted_at")
        .eq("nuvemshop_checkout_id", String(checkout.id))
        .limit(1);

      const isNew = !existing || existing.length === 0;

      const { error } = await supabase.from("nuvemshop_abandoned_checkouts").upsert(
        {
          nuvemshop_checkout_id: String(checkout.id),
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          recovery_url: checkout.checkout_url || checkout.recovery_url || null,
          total,
          currency: checkout.currency || "BRL",
          products,
          status: "abandoned",
          created_at_nuvemshop: checkout.created_at || null,
          user_id: ownerUserId,
        },
        { onConflict: "nuvemshop_checkout_id" }
      );

      if (error) {
        console.error(`Error upserting checkout ${checkout.id}:`, error.message);
        errors++;
      } else {
        synced++;

        // ── Upsert customer into imported_customers for segmentation ──
        if (customerPhone || customerEmail) {
          try {
            let existingCustomer = null;
            if (customerPhone) {
              const cleanPhone = customerPhone.replace(/\D/g, "");
              const { data } = await supabase
                .from("imported_customers")
                .select("id")
                .eq("phone", cleanPhone)
                .limit(1);
              if (data?.length) existingCustomer = data[0];
            }
            if (!existingCustomer && customerEmail) {
              const { data } = await supabase
                .from("imported_customers")
                .select("id")
                .eq("email", customerEmail)
                .limit(1);
              if (data?.length) existingCustomer = data[0];
            }

            if (!existingCustomer) {
              const insertData: Record<string, any> = {
                name: customerName || "Cliente",
                source: "abandoned_checkout",
                order_count: 0,
                user_id: ownerUserId,
              };
              if (customerPhone) insertData.phone = customerPhone.replace(/\D/g, "");
              if (customerEmail) insertData.email = customerEmail;

              await supabase.from("imported_customers").insert(insertData);
              console.log(`New customer from abandoned checkout: ${customerName}`);
            }
          } catch (syncErr) {
            console.error("Error syncing checkout customer:", syncErr);
          }
        }

        // Track new checkouts with phone for automation
        if (isNew && customerPhone) {
          newCheckoutIds.push(checkout.id);
          const phone = customerPhone.replace(/\D/g, "");
          const firstName = (customerName || "Cliente").split(" ")[0];
          const productsList = products.map((p: any) => `${p.quantity}x ${p.name}`).join("\n");
          const recoveryUrl = checkout.checkout_url || checkout.recovery_url || "";

          // ── Journey trigger (priority over automations) ──
          let journeyHandled = false;
          const { data: journeys } = await supabase
            .from("customer_journeys")
            .select("id")
            .eq("trigger_event", "cart")
            .eq("is_active", true)
            .eq("status", "active");

          if (journeys && journeys.length > 0) {
            journeyHandled = true;
            for (const journey of journeys) {
              // Dedup
              const { data: existingJExec } = await supabase
                .from("journey_executions")
                .select("id")
                .eq("journey_id", journey.id)
                .eq("customer_phone", phone)
                .gte("started_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
                .limit(1);

              if (existingJExec && existingJExec.length > 0) {
                console.log(`Journey dedup: cart journey ${journey.id} already running for ${phone}`);
                continue;
              }

              await supabase.from("journey_executions").insert({
                journey_id: journey.id,
                customer_phone: phone,
                customer_email: customerEmail,
                customer_name: customerName,
                user_id: ownerUserId,
                status: "active",
                started_at: new Date().toISOString(),
                next_action_at: new Date().toISOString(),
                execution_data: { trigger_checkout_id: checkout.id, trigger_event: "cart", recovery_url: recoveryUrl },
              });
              console.log(`Journey execution created for cart: ${journey.id} for ${phone}`);
            }

            await supabase
              .from("nuvemshop_abandoned_checkouts")
              .update({ contacted_at: new Date().toISOString(), contact_channel: "journey" })
              .eq("nuvemshop_checkout_id", String(checkout.id));
          }

          // Only trigger legacy automations if no journey handled
          if (!journeyHandled) {
            const { data: flows } = await supabase
              .from("automation_flows")
              .select("*")
              .eq("trigger_event", "abandoned_checkout")
              .eq("status", "active");

            if (flows && flows.length > 0) {
              for (const flow of flows) {
                const now = new Date();
                let delayMs = 0;
                if (flow.delay_unit === "minutes") delayMs = flow.delay_value * 60 * 1000;
                else if (flow.delay_unit === "hours") delayMs = flow.delay_value * 3600 * 1000;
                else if (flow.delay_unit === "days") delayMs = flow.delay_value * 86400 * 1000;

                const scheduledAt = new Date(now.getTime() + delayMs);

                const messageContent = (flow.message_content || "")
                  .replace(/\[nome_cliente\]/g, firstName)
                  .replace(/\[lista_produtos\]/g, productsList)
                  .replace(/\[total_pedido\]/g, `R$ ${total.toFixed(2).replace(".", ",")}`)
                  .replace(/\[link_recuperacao\]/g, recoveryUrl)
                  .replace(/\[link_checkout\]/g, recoveryUrl);

                const { error: execError } = await supabase.from("automation_executions").insert({
                  flow_id: flow.id,
                  user_id: ownerUserId,
                  trigger_data: {
                    checkout_id: checkout.id,
                    event: "abandoned_checkout",
                    customer_name: customerName,
                    customer_phone: phone,
                    message_content: messageContent,
                    media_url: flow.media_url,
                    media_type: flow.media_type,
                  },
                  scheduled_at: scheduledAt.toISOString(),
                  phone,
                  customer_name: customerName,
                  status: "pending",
                });

                if (execError) {
                  console.error(`Error scheduling abandoned checkout automation: ${execError.message}`);
                } else {
                  console.log(`Abandoned checkout automation scheduled: ${flow.name} for ${phone}`);
                }
              }

              await supabase
                .from("nuvemshop_abandoned_checkouts")
                .update({ contacted_at: new Date().toISOString(), contact_channel: "whatsapp" })
                .eq("nuvemshop_checkout_id", String(checkout.id));
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_fetched: checkouts.length,
        synced,
        errors,
        page,
        has_more: checkouts.length === perPage,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
