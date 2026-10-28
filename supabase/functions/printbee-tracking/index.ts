import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { verifyUserJwt, createServiceClient } from "../_shared/auth.ts";
import { orderIdentifierSchema, projectTracking } from "../_shared/printbee-tracking.ts";
import { getNuvemshopCredentials } from "../_shared/nuvemshop.ts";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), order: orderIdentifierSchema }),
  z.object({ action: z.literal("view"), linkId: z.string().uuid() }),
]);
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
class ProviderError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
let access: { token: string; expiresAt: number } | null = null;
async function getAccessToken() {
  if (access && access.expiresAt > Date.now()) return access.token;
  const clientId = Deno.env.get("PRINTBEE_CLIENT_ID");
  const clientSecret = Deno.env.get("PRINTBEE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new ProviderError(503, "Configure as credenciais da Printbee para consultar pedidos.");
  const response = await fetch("https://api.printbee.com.br/api/Auth/Token", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grantType: "client_credentials", clientId, clientSecret, expires: 1 }),
    signal: AbortSignal.timeout(25000),
  });
  // Auth responses may contain credentials; never log, store or return their raw body.
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ProviderError(response.status, response.status === 401 || response.status === 400
    ? "A Printbee recusou o Client ID ou Client Secret. Confira as credenciais em Integrações na Printbee."
    : `A autenticação da Printbee está indisponível (HTTP ${response.status}).`);
  const parsed = z.object({ data: z.object({ access_token: z.string().min(1), expires_in: z.number().positive() }) }).safeParse(payload);
  if (!parsed.success) throw new ProviderError(502, "A Printbee retornou uma resposta de autenticação inesperada.");
  access = { token: parsed.data.data.access_token, expiresAt: Date.now() + Math.max(0, parsed.data.data.expires_in - 60) * 1000 };
  return access.token;
}
async function lookup(order: string, retry = true) {
  const token = await getAccessToken();
  const response = await fetch(`https://api.printbee.com.br/api/Customers/Orders/${encodeURIComponent(order)}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(25000),
  });
  if (response.status === 204 || response.status === 404) {
    await response.text();
    throw new ProviderError(404, "Pedido não encontrado na conta Printbee conectada.");
  }
  if (response.status === 401 && retry) { await response.text(); access = null; return lookup(order, false); }
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ProviderError(response.status, `A Printbee não permitiu consultar este pedido (HTTP ${response.status}).`);
  const source = payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
  let projected = projectTracking(source);

  // If customerName or address is missing, check nuvemshop_orders as fallback
  if (!projected.customerName || !projected.street) {
    try {
      const orderNum = order.replace(/^BEE0*/i, "");
      const service = createServiceClient();
      const { data: nsOrder } = await service
        .from("nuvemshop_orders")
        .select("nuvemshop_order_id, customer_name")
        .or(`order_number.eq.${orderNum},order_number.eq.0000${orderNum},order_number.ilike.%${orderNum}%`)
        .limit(1)
        .maybeSingle();

      if (nsOrder) {
        let shippingAddr: any = null;
        if (nsOrder.nuvemshop_order_id) {
          try {
            const { accessToken: nsToken, storeId } = await getNuvemshopCredentials(service);
            const r = await fetch(`https://api.tiendanube.com/v1/${storeId}/orders/${nsOrder.nuvemshop_order_id}`, {
              headers: {
                Authentication: `bearer ${nsToken}`,
                "User-Agent": "LOUDER.ink (allvisualweb@gmail.com)",
                "Content-Type": "application/json",
              },
              signal: AbortSignal.timeout(10000),
            });
            if (r.ok) {
              const o = await r.json();
              shippingAddr = o.shipping_address || o.billing_address || {};
            }
          } catch {
            // Non-blocking Nuvemshop API fallback
          }
        }

        projected = projectTracking({
          ...projected,
          customerName: projected.customerName || nsOrder.customer_name || shippingAddr?.name || null,
          recipientName: projected.recipientName || nsOrder.customer_name || shippingAddr?.name || null,
          street: projected.street || shippingAddr?.address || null,
          number: projected.number || (shippingAddr?.number ? String(shippingAddr.number) : null),
          complement: projected.complement || shippingAddr?.floor || null,
          district: projected.district || shippingAddr?.locality || null,
          city: projected.city || shippingAddr?.city || null,
          state: projected.state || shippingAddr?.province || null,
          zipCode: projected.zipCode || (shippingAddr?.zipcode ? String(shippingAddr.zipcode) : null),
        });
      }
    } catch {
      // Non-blocking fallback
    }
  }

  return { ...projected, orderNSU: projected.orderNSU || order };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Método não permitido." }, 405);
  try {
    const input = bodySchema.safeParse(await req.json().catch(() => null));
    if (!input.success) return reply({ error: "Informe um pedido válido ou link de rastreio válido." }, 400);
    if (input.data.action === "generate") {
      const auth = await verifyUserJwt(req);
      if (!auth.ok) return auth.response;
      const tracking = await lookup(input.data.order);
      const service = createServiceClient();
      const { data, error } = await service.from("printbee_tracking_links").upsert({
        user_id: auth.auth.userId, order_identifier: input.data.order,
        tracking_data: tracking, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,order_identifier" }).select("id,updated_at").single();
      if (error || !data) return reply({ error: "Não foi possível salvar o link de rastreio." }, 500);
      return reply({ linkId: data.id, tracking, updatedAt: data.updated_at });
    }
    // A random per-order UUID is the sole public capability; sequential order IDs never grant access.
    const service = createServiceClient();
    const { data, error } = await service.from("printbee_tracking_links").select("id,order_identifier,tracking_data,updated_at")
      .eq("id", input.data.linkId).maybeSingle();
    if (error) return reply({ error: "Não foi possível carregar este rastreio." }, 500);
    if (!data) return reply({ error: "Link de rastreio não encontrado." }, 404);
    let tracking = projectTracking(data.tracking_data);
    let updatedAt = data.updated_at;
    let warning: string | undefined;

    const needsEnrichment = !tracking.customerName || !tracking.street;
    if (needsEnrichment || Date.now() - new Date(updatedAt).getTime() > 60000) {
      try {
        tracking = await lookup(data.order_identifier);
        const now = new Date().toISOString();
        const { error: saveError } = await service.from("printbee_tracking_links").update({ tracking_data: tracking, updated_at: now }).eq("id", data.id);
        if (!saveError) updatedAt = now;
      } catch { warning = "Atualização temporariamente indisponível. Exibindo a última consulta salva."; }
    }
    return reply({ tracking, updatedAt, warning });
  } catch (error) {
    if (error instanceof ProviderError) return reply({ error: error.message, providerStatus: error.status }, error.status === 404 ? 404 : 502);
    return reply({ error: "Não foi possível consultar a Printbee. Tente novamente em instantes." }, 502);
  }
});