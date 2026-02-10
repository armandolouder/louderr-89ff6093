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

    // Upsert order (avoid duplicate key errors)
    const { error } = await supabase.from("nuvemshop_orders").upsert(
      {
        nuvemshop_order_id: orderId,
        store_id: storeId,
        event,
        status,
        payment_status: paymentStatus,
        shipping_status: shippingStatus,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        total,
        currency,
        products,
        raw_data: order,
      },
      { onConflict: "nuvemshop_order_id" }
    );

    if (error) {
      console.error("Error upserting order:", error);
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
      const { data: flows } = await supabase
        .from("automation_flows")
        .select("*")
        .eq("trigger_event", triggerEvent)
        .eq("status", "active");

      if (flows && flows.length > 0) {
        const phone = customerPhone.replace(/\D/g, "");
        console.log(`Found ${flows.length} active flows for event ${triggerEvent}, phone: ${phone}`);
        
        for (const flow of flows) {
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

          const messageContent = flow.message_content
            .replace(/\[nome_cliente\]/g, firstName)
            .replace(/\[numero_pedido\]/g, order.number || String(orderId))
            .replace(/\[total_pedido\]/g, `R$ ${total.toFixed(2).replace(".", ",")}`)
            .replace(/\[link_pagamento\]/g, order.checkout_url || "")
            .replace(/\[link_boleto\]/g, order.payment_details?.boleto_url || "")
            .replace(/\[url_sucesso\]/g, "https://www.louder.ink")
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
                const messageContent = flow.message_content
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
