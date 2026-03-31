import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const API_BASE = "https://api.tiendanube.com/v1";

interface NuvemshopCustomer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  total_spent: string;
  total_spent_currency: string;
  orders_count: number;
  billing_city?: string;
  billing_province?: string;
  created_at: string;
  updated_at: string;
}

const STATE_TO_REGION: Record<string, string> = {
  AC: "Norte", AP: "Norte", AM: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

function cleanPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function getRegion(province: string | null | undefined): string | null {
  if (!province) return null;
  const upper = province.trim().toUpperCase();
  if (STATE_TO_REGION[upper]) return STATE_TO_REGION[upper];
  const match = upper.match(/\b([A-Z]{2})$/);
  if (match && STATE_TO_REGION[match[1]]) return STATE_TO_REGION[match[1]];
  return null;
}

async function fetchAllCustomers(accessToken: string, storeId: string): Promise<NuvemshopCustomer[]> {
  const allCustomers: NuvemshopCustomer[] = [];
  let page = 1;
  const perPage = 200;
  const maxPages = 100;

  while (page <= maxPages) {
    const url = `${API_BASE}/${storeId}/customers?page=${page}&per_page=${perPage}`;
    console.log(`Fetching customers page ${page}...`);

    const response = await fetch(url, {
      headers: {
        Authentication: `bearer ${accessToken.trim()}`,
        "User-Agent": "LOUDER.ink (allvisualweb@gmail.com)",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log("Rate limited, waiting 3s...");
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      break;
    }

    const customers: NuvemshopCustomer[] = await response.json();
    console.log(`Page ${page}: ${customers.length} customers`);
    if (!customers.length) break;
    allCustomers.push(...customers);
    if (customers.length < perPage) break;
    page++;
    await new Promise((r) => setTimeout(r, 500));
  }

  return allCustomers;
}

async function fetchCustomerOrdersFromAPI(accessToken: string, storeId: string, customerId: number) {
  const url = `${API_BASE}/${storeId}/orders?customer_id=${customerId}&per_page=200`;
  const response = await fetch(url, {
    headers: {
      Authentication: `bearer ${accessToken.trim()}`,
      "User-Agent": "LOUDER.ink (allvisualweb@gmail.com)",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) return { totalSpent: 0, orderCount: 0, firstPurchase: null as string | null, lastPurchase: null as string | null };

  const orders = await response.json();
  let totalSpent = 0, orderCount = 0;
  let firstPurchase: string | null = null, lastPurchase: string | null = null;

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    totalSpent += parseFloat(order.total || "0");
    orderCount++;
    const date = order.created_at;
    if (date) {
      if (!firstPurchase || date < firstPurchase) firstPurchase = date;
      if (!lastPurchase || date > lastPurchase) lastPurchase = date;
    }
  }
  return { totalSpent, orderCount, firstPurchase, lastPurchase };
}

async function upsertCustomer(supabase: any, customer: any) {
  if (customer.phone) {
    const { data: existing } = await supabase
      .from("imported_customers").select("id")
      .eq("phone", customer.phone).maybeSingle();
    if (existing) {
      await supabase.from("imported_customers").update(customer).eq("id", existing.id);
      return "updated";
    }
  }
  if (customer.email) {
    const { data: existing } = await supabase
      .from("imported_customers").select("id")
      .eq("email", customer.email).maybeSingle();
    if (existing) {
      await supabase.from("imported_customers").update(customer).eq("id", existing.id);
      return "updated";
    }
  }
  const { error } = await supabase.from("imported_customers").insert(customer);
  return error ? "error" : "inserted";
}

async function calculateRFMScores(supabase: any) {
  console.log("Calculating RFM scores...");

  // Get all customers with purchase data
  const { data: customers } = await supabase
    .from("imported_customers")
    .select("id, last_purchase_at, order_count, total_spent")
    .not("last_purchase_at", "is", null)
    .gt("order_count", 0);

  if (!customers?.length) {
    console.log("No customers with purchase data for RFM");
    return;
  }

  // Calculate days since last purchase for each
  const now = Date.now();
  const enriched = customers.map((c: any) => ({
    ...c,
    daysSince: Math.floor((now - new Date(c.last_purchase_at).getTime()) / 86400000),
    totalSpent: parseFloat(c.total_spent) || 0,
    orderCount: c.order_count || 0,
  }));

  // Sort and assign quintiles
  const assignQuintile = (arr: any[], key: string, ascending: boolean) => {
    const sorted = [...arr].sort((a, b) => ascending ? a[key] - b[key] : b[key] - a[key]);
    const size = Math.ceil(sorted.length / 5);
    sorted.forEach((item, i) => {
      item[`${key}_q`] = Math.min(5, Math.floor(i / size) + 1);
    });
    return sorted;
  };

  // R: lower days = higher score, so sort descending (most recent = quintile 5)
  let scored = assignQuintile(enriched, "daysSince", false); // descending: highest days first = quintile 1
  scored = assignQuintile(scored, "orderCount", true);       // ascending: lowest first = quintile 1
  scored = assignQuintile(scored, "totalSpent", true);       // ascending: lowest first = quintile 1

  // Build lookup
  const scoreMap = new Map<string, { r: number; f: number; m: number }>();
  scored.forEach((s: any) => {
    scoreMap.set(s.id, { r: s.daysSince_q, f: s.orderCount_q, m: s.totalSpent_q });
  });

  // Batch update
  let updated = 0;
  for (const customer of customers) {
    const scores = scoreMap.get(customer.id);
    if (!scores) continue;
    await supabase.from("imported_customers").update({
      rfm_recency: scores.r,
      rfm_frequency: scores.f,
      rfm_monetary: scores.m,
      rfm_score: `${scores.r}${scores.f}${scores.m}`,
    }).eq("id", customer.id);
    updated++;
  }
  console.log(`RFM scores updated for ${updated} customers`);
}

async function processSync(supabase: any, jobId: string) {
  try {
    const accessToken = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN")!;
    const storeId = Deno.env.get("NUVEMSHOP_STORE_ID")!;

    console.log("Fetching all customers from Nuvemshop...");
    const customers = await fetchAllCustomers(accessToken, storeId);
    console.log(`Total customers fetched: ${customers.length}`);

    if (!customers.length) {
      await supabase.from("import_batches").update({
        status: "failed",
        error_message: "Nenhum cliente encontrado na Nuvemshop",
      }).eq("id", jobId);
      return;
    }

    let synced = 0, errors = 0;

    // Process each customer - fetch their orders from API for accurate data
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      try {
        const phone = cleanPhone(c.phone);
        const email = c.email || null;
        if (!phone && !email) continue;

        // Fetch orders directly from Nuvemshop API
        const orderData = await fetchCustomerOrdersFromAPI(accessToken, storeId, c.id);

        const customerData = {
          phone,
          email,
          name: c.name || "Cliente",
          source: "nuvemshop",
          total_spent: orderData.totalSpent || parseFloat(c.total_spent || "0"),
          order_count: orderData.orderCount || c.orders_count || 0,
          first_purchase_at: orderData.firstPurchase,
          last_purchase_at: orderData.lastPurchase,
          city: c.billing_city || null,
          state: c.billing_province || null,
          region: getRegion(c.billing_province),
          metadata: { nuvemshop_customer_id: c.id },
        };

        const result = await upsertCustomer(supabase, customerData);
        if (result === "error") errors++;
        else synced++;

        // Rate limit protection
        if ((i + 1) % 10 === 0) {
          await new Promise((r) => setTimeout(r, 1000));
          await supabase.from("import_batches").update({
            valid_rows: synced,
            invalid_rows: errors,
            total_rows: customers.length,
          }).eq("id", jobId);
          console.log(`Progress: ${synced}/${customers.length} synced, ${errors} errors`);
        }
      } catch (e) {
        console.error(`Error processing customer ${c.name}:`, e);
        errors++;
      }
    }

    // Enrich from local nuvemshop_orders for any missing dates
    console.log("Enriching from local orders...");
    const { data: customersNoDates } = await supabase
      .from("imported_customers")
      .select("id, phone")
      .is("first_purchase_at", null)
      .not("phone", "is", null)
      .eq("source", "nuvemshop")
      .limit(1000);

    if (customersNoDates?.length) {
      for (const cust of customersNoDates) {
        const { data: orders } = await supabase
          .from("nuvemshop_orders")
          .select("order_date, total")
          .or(`customer_phone.eq.${cust.phone},customer_phone.like.%${cust.phone.slice(-8)}%`)
          .order("order_date", { ascending: true });

        if (orders?.length) {
          await supabase.from("imported_customers").update({
            first_purchase_at: orders[0].order_date,
            last_purchase_at: orders[orders.length - 1].order_date,
            total_spent: orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0),
            order_count: orders.length,
          }).eq("id", cust.id);
        }
      }
    }

    // Calculate RFM scores
    await calculateRFMScores(supabase);

    await supabase.from("import_batches").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_rows: customers.length,
      valid_rows: synced,
      invalid_rows: errors,
    }).eq("id", jobId);

    console.log(`Sync complete: ${synced} synced, ${errors} errors out of ${customers.length} total`);
  } catch (error) {
    console.error("Sync error:", error);
    await supabase.from("import_batches").update({
      status: "failed",
      error_message: error.message,
    }).eq("id", jobId);
  }
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
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job_id");

    if (jobId) {
      const { data: job } = await supabase
        .from("import_batches")
        .select("status, error_message, total_rows, valid_rows, invalid_rows, completed_at")
        .eq("id", jobId)
        .single();

      return new Response(
        JSON.stringify({ success: true, job_id: jobId, ...job }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: job, error: jobError } = await supabase
      .from("import_batches")
      .insert({ filename: "nuvemshop_customers_sync", status: "processing", total_rows: 0 })
      .select()
      .single();

    if (jobError) throw jobError;

    // @ts-ignore
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processSync(supabase, job.id));
    } else {
      processSync(supabase, job.id).catch(console.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        message: "Sincronização completa de clientes Nuvemshop iniciada com cálculo RFM. Aguarde...",
        status: "processing",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
