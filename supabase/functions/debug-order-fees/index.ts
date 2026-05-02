import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const token = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN")?.trim();
  const storeId = Deno.env.get("NUVEMSHOP_STORE_ID");
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "3630";

  const list = await fetch(`https://api.tiendanube.com/v1/${storeId}/orders?q=${q}&per_page=1`, {
    headers: { "Authentication": `bearer ${token}`, "User-Agent": "LOUDER.ink (allvisualweb@gmail.com)" }
  });
  const orders = await list.json();
  const order = orders?.[0];
  if (!order) return new Response(JSON.stringify({ error: "not found", orders }), { headers: { ...cors, "Content-Type": "application/json" } });

  const detail = await fetch(`https://api.tiendanube.com/v1/${storeId}/orders/${order.id}`, {
    headers: { "Authentication": `bearer ${token}`, "User-Agent": "LOUDER.ink (allvisualweb@gmail.com)" }
  });
  const full = await detail.json();

  const tx = await fetch(`https://api.tiendanube.com/v1/${storeId}/orders/${order.id}/transactions`, {
    headers: { "Authentication": `bearer ${token}`, "User-Agent": "LOUDER.ink (allvisualweb@gmail.com)" }
  });
  const txData = await tx.json();

  return new Response(JSON.stringify({
    order_keys: Object.keys(full),
    order_money_fields: {
      total: full.total,
      subtotal: full.subtotal,
      discount: full.discount,
      total_paid_by_customer: full.total_paid_by_customer,
      total_paid_by_customer_including_fees: full.total_paid_by_customer_including_fees,
      shipping_cost_customer: full.shipping_cost_customer,
      shipping_cost_owner: full.shipping_cost_owner,
      gateway: full.gateway,
      gateway_name: full.gateway_name,
    },
    transactions: txData,
    total_paid: full.total_paid,
    payment_details: full.payment_details,
    payment_count: full.payment_count,
    extra: full.extra,
    next_action: full.next_action,
    payments: (full as any).payments,
    promotional_discount: full.promotional_discount,
  }, null, 2), { headers: { ...cors, "Content-Type": "application/json" } });
});
