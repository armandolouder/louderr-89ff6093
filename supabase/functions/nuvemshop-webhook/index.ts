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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve owner user_id for multi-tenant data isolation
    const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
    const ownerUserId = ownerData as string | null;

    const NUVEMSHOP_ACCESS_TOKEN = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN");
    const NUVEMSHOP_STORE_ID = Deno.env.get("NUVEMSHOP_STORE_ID");

    const body = await req.json();
    console.log("Nuvemshop webhook received:", JSON.stringify(body));

    const event = body.event as string;
    const storeId = body.store_id || parseInt(NUVEMSHOP_STORE_ID || "0");
    const orderId = body.id || body.order_id;

    // The webhook payload from Nuvemshop is minimal (only store_id, id, event)
    // We need to fetch the full order details from the API
    let order = body;
    if (NUVEMSHOP_ACCESS_TOKEN && NUVEMSHOP_STORE_ID && orderId) {
      try {
        console.log(`Fetching full order details for order ${orderId}`);
        const orderRes = await fetch(
          `https://api.tiendanube.com/v1/${NUVEMSHOP_STORE_ID}/orders/${orderId}`,
          {
            headers: {
              "Authentication": `bearer ${NUVEMSHOP_ACCESS_TOKEN}`,
              "User-Agent": "LOUDER.ink (contato@louder.ink)",
              "Content-Type": "application/json",
            },
          }
        );
        if (orderRes.ok) {
          order = await orderRes.json();
          console.log("Full order fetched successfully");
        } else {
          console.error(`Failed to fetch order: ${orderRes.status}`);
        }
      } catch (fetchErr) {
        console.error("Error fetching order details:", fetchErr);
      }
    }

    const customerName =
      order.customer?.name ||
      `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() ||
      null;
    const customerEmail = order.customer?.email || null;
    const customerPhone = order.customer?.phone || null;
    const total = order.total ? parseFloat(order.total) : 0;
    const currency = order.currency || "BRL";
    const status = order.status || null;
    const paymentStatus = order.payment_status || null;
    const shippingStatus = order.shipping_status || null;

    const products = (order.products || []).map((p: any) => ({
      id: p.product_id,
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      sku: p.sku,
    }));

    // Build checkout success URL from store domain + order token
    let checkoutSuccessUrl = "";
    if (NUVEMSHOP_ACCESS_TOKEN && NUVEMSHOP_STORE_ID && order.token) {
      try {
        const storeRes = await fetch(
          `https://api.tiendanube.com/v1/${NUVEMSHOP_STORE_ID}/store`,
          {
            headers: {
              "Authentication": `bearer ${NUVEMSHOP_ACCESS_TOKEN}`,
              "User-Agent": "LOUDER.ink (contato@louder.ink)",
              "Content-Type": "application/json",
            },
          }
        );
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          const domain = storeData.url_with_protocol || `https://${storeData.original_domain}`;
          checkoutSuccessUrl = `${domain}/checkout/v3/success/${orderId}/${order.token}`;
          console.log(`Checkout success URL built: ${checkoutSuccessUrl}`);
        }
      } catch (storeErr) {
        console.error("Error fetching store info for URL:", storeErr);
      }
    }

    // Upsert order (avoid duplicate key errors)
    const { error } = await supabase.from("nuvemshop_orders").upsert(
      {
        nuvemshop_order_id: String(orderId),
        status,
        payment_status: paymentStatus,
        shipping_status: shippingStatus,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        total,
        currency,
        products,
        order_date: order.created_at || null,
        order_number: order.number?.toString() || null,
        user_id: ownerUserId,
      },
      { onConflict: "nuvemshop_order_id" }
    );

    if (error) {
      console.error("Error upserting order:", error);
    }

    // ── Upsert customer into imported_customers for segmentation ──
    if (customerPhone || customerEmail) {
      try {
        const identifier = customerPhone?.replace(/\D/g, "") || customerEmail;
        // Check if customer already exists by phone or email
        let existingCustomer = null;
        if (customerPhone) {
          const cleanPhone = customerPhone.replace(/\D/g, "");
          const { data } = await supabase
            .from("imported_customers")
            .select("id, total_spent, order_count, first_purchase_at")
            .eq("phone", cleanPhone)
            .limit(1);
          if (data?.length) existingCustomer = data[0];
        }
        if (!existingCustomer && customerEmail) {
          const { data } = await supabase
            .from("imported_customers")
            .select("id, total_spent, order_count, first_purchase_at")
            .eq("email", customerEmail)
            .limit(1);
          if (data?.length) existingCustomer = data[0];
        }

        const isNonCancelled = event !== "order/cancelled";
        const orderDate = order.created_at || new Date().toISOString();

        if (existingCustomer) {
          // Update existing customer with new order data
          const updateData: Record<string, any> = {
            name: customerName || existingCustomer.name,
          };
          if (customerPhone) updateData.phone = customerPhone.replace(/\D/g, "");
          if (customerEmail) updateData.email = customerEmail;
          if (isNonCancelled && (event === "order/paid" || event === "order/created")) {
            updateData.total_spent = (Number(existingCustomer.total_spent) || 0) + total;
            updateData.order_count = (existingCustomer.order_count || 0) + 1;
            updateData.last_purchase_at = orderDate;
            if (!existingCustomer.first_purchase_at) {
              updateData.first_purchase_at = orderDate;
            }
          }
          updateData.source = "nuvemshop";

          await supabase
            .from("imported_customers")
            .update(updateData)
            .eq("id", existingCustomer.id);
          console.log(`Updated imported_customer ${existingCustomer.id}`);
        } else {
          // Insert new customer
          const insertData: Record<string, any> = {
            name: customerName || "Cliente",
            source: "nuvemshop",
            user_id: ownerUserId,
          };
          if (customerPhone) insertData.phone = customerPhone.replace(/\D/g, "");
          if (customerEmail) insertData.email = customerEmail;
          if (isNonCancelled) {
            insertData.total_spent = total;
            insertData.order_count = 1;
            insertData.first_purchase_at = orderDate;
            insertData.last_purchase_at = orderDate;
          }
          // Extract location from order
          if (order.customer?.billing_city || order.billing_city) {
            insertData.city = order.customer?.billing_city || order.billing_city;
          }
          if (order.customer?.billing_province || order.billing_province) {
            insertData.state = order.customer?.billing_province || order.billing_province;
          }

          await supabase.from("imported_customers").insert(insertData);
          console.log(`Inserted new imported_customer for ${customerName}`);
        }
      } catch (syncErr) {
        console.error("Error syncing customer to imported_customers:", syncErr);
      }
    }

    // ── Trigger matching automation flows ──
    const triggerMap: Record<string, string> = {
      "order/created": "order/created",
      "order/paid": "order/paid",
      "order/packed": "order/packed",
      "order/fulfilled": "order/fulfilled",
      "order/cancelled": "order/cancelled",
    };

    const triggerEvent = triggerMap[event];
    if (triggerEvent && customerPhone) {
      const phone = customerPhone.replace(/\D/g, "");

      // ── Journey trigger (priority over automations) ──
      const journeyTriggerMap: Record<string, string> = {
        "order/created": "purchase",
        "order/paid": "payment_confirmed",
        "order/packed": "delivered",
        "order/fulfilled": "shipped",
      };

      // Also check payment_status for pending payments (boleto/pix)
      const journeyTriggers: string[] = [];
      const jt = journeyTriggerMap[event];
      if (jt) journeyTriggers.push(jt);

      // order/created with pending payment → also trigger payment_pending
      if (event === "order/created") {
        journeyTriggers.push("purchase");
        if (paymentStatus === "pending" || paymentStatus === "authorized") {
          journeyTriggers.push("payment_pending");
        }
      }
      // order/paid → payment_confirmed
      if (event === "order/paid") {
        journeyTriggers.push("purchase");
      }
      // Deduplicate triggers
      const uniqueTriggers = [...new Set(journeyTriggers)];
      
      if (uniqueTriggers.length > 0) {
        for (const journeyTrigger of uniqueTriggers) {
          const { data: journeys } = await supabase
            .from("customer_journeys")
            .select("id, nodes, trigger_event")
            .eq("trigger_event", journeyTrigger)
            .eq("is_active", true)
            .eq("status", "active");

          if (journeys && journeys.length > 0) {
            journeyHandled = true;
            for (const journey of journeys) {
              // Dedup: skip if execution exists for this journey + order
              const { data: existingJExec } = await supabase
                .from("journey_executions")
                .select("id")
                .eq("journey_id", journey.id)
                .eq("customer_phone", phone)
                .gte("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .limit(1);

              if (existingJExec && existingJExec.length > 0) {
                console.log(`Journey dedup: ${journey.id} already running for ${phone}`);
                continue;
              }

              const { error: jExecErr } = await supabase.from("journey_executions").insert({
                journey_id: journey.id,
                customer_phone: phone,
                customer_email: customerEmail,
                customer_name: customerName,
                user_id: ownerUserId,
                status: "active",
                started_at: new Date().toISOString(),
                next_action_at: new Date().toISOString(),
                execution_data: { trigger_order_id: orderId, trigger_event: event, payment_status: paymentStatus },
              });

              if (jExecErr) {
                console.error(`Error creating journey execution:`, jExecErr);
              } else {
                console.log(`Journey execution created: ${journey.id} (trigger: ${journeyTrigger}) for ${phone}`);
              }
            }
          }
        }
      }

      // Only trigger legacy automations if no journey handled this event
      if (!journeyHandled) {
        const { data: flows } = await supabase
          .from("automation_flows")
          .select("*")
          .eq("trigger_event", triggerEvent)
          .eq("status", "active");

        if (flows && flows.length > 0) {
          console.log(`Found ${flows.length} active flows for event ${triggerEvent}, phone: ${phone}`);
          
          for (const flow of flows) {
            // Deduplication: skip if execution already exists for this flow + order
            const { data: existingExec } = await supabase
              .from("automation_executions")
              .select("id")
              .eq("flow_id", flow.id)
              .eq("phone", phone)
              .filter("trigger_data->>order_id", "eq", String(orderId))
              .limit(1);

            if (existingExec && existingExec.length > 0) {
              console.log(`Skipping duplicate: flow ${flow.name} already scheduled for order ${orderId}`);
              continue;
            }

            // Calculate scheduled time based on delay
            const now = new Date();
            let delayMs = 0;
            if (flow.delay_unit === "minutes") delayMs = flow.delay_value * 60 * 1000;
            else if (flow.delay_unit === "hours") delayMs = flow.delay_value * 3600 * 1000;
            else if (flow.delay_unit === "days") delayMs = flow.delay_value * 86400 * 1000;
            
            const scheduledAt = new Date(now.getTime() + delayMs);

            // Replace variables in message
            const productsList = products.map((p: any) => `${p.quantity}x ${p.name}`).join("\n");
            const trackingCode = order.shipping_tracking_number || order.tracking_number || "";
            const firstName = (customerName || "Cliente").split(" ")[0];

            const messageContent = (flow.message_content || "")
              .replace(/\[nome_cliente\]/g, firstName)
              .replace(/\[numero_pedido\]/g, order.number || String(orderId))
              .replace(/\[total_pedido\]/g, `R$ ${total.toFixed(2).replace(".", ",")}`)
              .replace(/\[link_pagamento\]/g, order.checkout_url || "")
              .replace(/\[link_boleto\]/g, order.payment_details?.boleto_url || "")
              .replace(/\[url_sucesso_pedido\]/g, checkoutSuccessUrl)
              .replace(/\[url_sucesso\]/g, checkoutSuccessUrl || "https://www.louder.ink")
              .replace(/\[lista_produtos\]/g, productsList)
              .replace(/\[codigo_rastreio\]/g, trackingCode);

            const { error: execError } = await supabase.from("automation_executions").insert({
              flow_id: flow.id,
              trigger_data: {
                order_id: orderId,
                event,
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
              console.error(`Error scheduling automation ${flow.name}:`, execError);
            } else {
              console.log(`Automation scheduled: ${flow.name} for ${phone} at ${scheduledAt.toISOString()}`);
            }
          }

          // Also schedule post-sale follow-ups if event is order/fulfilled
          if (event === "order/fulfilled") {
            const postSaleEvents = ["post_sale_15d", "post_sale_30d", "post_sale_45d", "post_sale_60d"];
            const postSaleDays = [15, 30, 45, 60];

            for (let i = 0; i < postSaleEvents.length; i++) {
              const { data: postFlows } = await supabase
                .from("automation_flows")
                .select("*")
                .eq("trigger_event", postSaleEvents[i])
                .eq("status", "active");

              if (postFlows && postFlows.length > 0) {
                for (const flow of postFlows) {
                  const scheduledAt = new Date(Date.now() + postSaleDays[i] * 86400 * 1000);
                  const postFirstName = (customerName || "Cliente").split(" ")[0];
                  const messageContent = (flow.message_content || "")
                    .replace(/\[nome_cliente\]/g, postFirstName)
                    .replace(/\[numero_pedido\]/g, order.number || String(orderId));

                  await supabase.from("automation_executions").insert({
                    flow_id: flow.id,
                    trigger_data: {
                      order_id: orderId,
                      event: postSaleEvents[i],
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

                  console.log(`Post-sale scheduled: ${flow.name} for ${phone} at ${scheduledAt.toISOString()}`);
                }
              }
            }
          }
        } else {
          console.log(`No active flows found for event ${triggerEvent}`);
        }
      }
    } else {
      console.log(`Skipping automation: triggerEvent=${triggerEvent}, customerPhone=${customerPhone}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
