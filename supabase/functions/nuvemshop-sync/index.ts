import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SyncOrdersParams {
  page: number;
  perPage: number;
  sinceId: string | null;
  createdAtMin: string | null;
  createdAtMax: string | null;
  customerIds: number[];
  q: string | null;
}

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
    ? parseInt(value, 10)
    : NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCustomerIds(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => parsePositiveInt(item, 0))
      .filter((item) => item > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => parsePositiveInt(item.trim(), 0))
      .filter((item) => item > 0);
  }

  return [] as number[];
}

async function getSyncParams(req: Request): Promise<SyncOrdersParams> {
  const url = new URL(req.url);
  let body: Record<string, unknown> = {};

  if (req.method !== "GET") {
    const rawBody = await req.text();

    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          body = parsed as Record<string, unknown>;
        }
      } catch {
        throw new Error("Body JSON inválido");
      }
    }
  }

  return {
    page: parsePositiveInt(body.page ?? url.searchParams.get("page"), 1),
    perPage: Math.min(
      parsePositiveInt(body.perPage ?? body.per_page ?? url.searchParams.get("per_page"), 50),
      200,
    ),
    sinceId: parseOptionalString(body.sinceId ?? body.since_id ?? url.searchParams.get("since_id")),
    createdAtMin: parseOptionalString(body.createdAtMin ?? body.created_at_min ?? url.searchParams.get("created_at_min")),
    createdAtMax: parseOptionalString(body.createdAtMax ?? body.created_at_max ?? url.searchParams.get("created_at_max")),
    customerIds: parseCustomerIds(body.customerIds ?? body.customer_ids ?? url.searchParams.get("customer_ids")),
    q: parseOptionalString(body.q ?? url.searchParams.get("q")),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const accessToken = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN");
    const storeId = Deno.env.get("NUVEMSHOP_STORE_ID");

    if (!accessToken || !storeId) {
      return new Response(
        JSON.stringify({ error: "NUVEMSHOP_ACCESS_TOKEN ou NUVEMSHOP_STORE_ID não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve owner user_id for multi-tenant data isolation
    const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
    const ownerUserId = ownerData as string | null;

    const { page, perPage, sinceId, createdAtMin, createdAtMax, customerIds, q } = await getSyncParams(req);

    const apiBaseUrl = "https://api.tiendanube.com/v1";
    let apiUrl = `${apiBaseUrl}/${storeId}/orders?page=${page}&per_page=${perPage}`;
    if (sinceId) {
      apiUrl += `&since_id=${sinceId}`;
    }
    if (createdAtMin) {
      apiUrl += `&created_at_min=${encodeURIComponent(createdAtMin)}`;
    }
    if (createdAtMax) {
      apiUrl += `&created_at_max=${encodeURIComponent(createdAtMax)}`;
    }
    if (customerIds.length > 0) {
      apiUrl += `&customer_ids=${encodeURIComponent(customerIds.join(","))}`;
    }
    if (q) {
      apiUrl += `&q=${encodeURIComponent(q)}`;
    }

    const trimmedToken = accessToken.trim();
    console.log(`Token first 8: ${trimmedToken.substring(0, 8)}, length: ${trimmedToken.length}, URL: ${apiUrl}`);

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

    const orders = await response.json();
    console.log(`Received ${orders.length} orders from Nuvemshop`);

    let synced = 0;
    let errors = 0;

    for (const order of orders) {
      const customerName =
        order.customer?.name ||
        order.contact_name ||
        `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() ||
        order.billing_name ||
        null;

      const customerEmail = order.customer?.email || order.contact_email || null;
      const customerPhone = order.customer?.phone || order.contact_phone || order.billing_phone || null;

      const products = (order.products || []).map((p: any) => ({
        id: p.product_id,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        sku: p.sku,
      }));

      const total = order.total ? parseFloat(order.total) : 0;

      const orderDate = order.created_at || null;

      const { error } = await supabase.from("nuvemshop_orders").upsert(
        {
          nuvemshop_order_id: (order.id || order.number)?.toString(),
          status: order.status || null,
          payment_status: order.payment_status || null,
          shipping_status: order.shipping_status || null,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          total,
          currency: order.currency || "BRL",
          products,
          order_date: orderDate,
          order_number: order.number?.toString() || null,
          user_id: ownerUserId,
        },
        { onConflict: "nuvemshop_order_id" }
      );

      if (error) {
        console.error(`Error upserting order ${order.id}:`, error.message);
        errors++;
      } else {
        synced++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_fetched: orders.length,
        synced,
        errors,
        page,
        has_more: orders.length === perPage,
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
