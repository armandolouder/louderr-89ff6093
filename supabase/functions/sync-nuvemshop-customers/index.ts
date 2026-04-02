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
  last_order_id?: number;
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

async function fetchCustomersPage(accessToken: string, storeId: string, page: number, perPage: number): Promise<NuvemshopCustomer[]> {
  const url = `${API_BASE}/${storeId}/customers?page=${page}&per_page=${perPage}`;
  console.log(`Fetching page ${page}...`);

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      headers: {
        Authentication: `bearer ${accessToken.trim()}`,
        "User-Agent": "LOUDER.ink (allvisualweb@gmail.com)",
        "Content-Type": "application/json",
      },
    });

    if (response.status === 429) {
      console.log("Rate limited, waiting 3s...");
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }

    if (!response.ok) {
      console.error(`Page ${page} failed: ${response.status}`);
      return [];
    }

    return await response.json();
  }
  return [];
}

async function upsertCustomerBatch(supabase: any, customers: any[]) {
  let synced = 0, errors = 0;

  for (const customer of customers) {
    try {
      if (customer.phone) {
        const { data: existing } = await supabase
          .from("imported_customers").select("id")
          .eq("phone", customer.phone).maybeSingle();
        if (existing) {
          await supabase.from("imported_customers").update(customer).eq("id", existing.id);
          synced++;
          continue;
        }
      }
      if (customer.email) {
        const { data: existing } = await supabase
          .from("imported_customers").select("id")
          .eq("email", customer.email).maybeSingle();
        if (existing) {
          await supabase.from("imported_customers").update(customer).eq("id", existing.id);
          synced++;
          continue;
        }
      }
      const { error } = await supabase.from("imported_customers").insert(customer);
      if (error) errors++;
      else synced++;
    } catch (e) {
      errors++;
    }
  }

  return { synced, errors };
}

async function calculateRFMScores(supabase: any) {
  console.log("Calculating RFM scores...");

  const { data: customers } = await supabase
    .from("imported_customers")
    .select("id, last_purchase_at, order_count, total_spent")
    .not("last_purchase_at", "is", null)
    .gt("order_count", 0);

  if (!customers?.length) {
    console.log("No customers with purchase data for RFM");
    return;
  }

  const now = Date.now();
  const enriched = customers.map((c: any) => ({
    ...c,
    daysSince: Math.floor((now - new Date(c.last_purchase_at).getTime()) / 86400000),
    totalSpent: parseFloat(c.total_spent) || 0,
    orderCount: c.order_count || 0,
  }));

  const assignQuintile = (arr: any[], key: string, ascending: boolean) => {
    const sorted = [...arr].sort((a, b) => ascending ? a[key] - b[key] : b[key] - a[key]);
    const size = Math.ceil(sorted.length / 5);
    sorted.forEach((item, i) => {
      item[`${key}_q`] = Math.min(5, Math.floor(i / size) + 1);
    });
    return sorted;
  };

  let scored = assignQuintile(enriched, "daysSince", false);
  scored = assignQuintile(scored, "orderCount", true);
  scored = assignQuintile(scored, "totalSpent", true);

  const scoreMap = new Map<string, { r: number; f: number; m: number }>();
  scored.forEach((s: any) => {
    scoreMap.set(s.id, { r: s.daysSince_q, f: s.orderCount_q, m: s.totalSpent_q });
  });

  const updates: Promise<any>[] = [];
  for (const customer of customers) {
    const scores = scoreMap.get(customer.id);
    if (!scores) continue;
    updates.push(
      supabase.from("imported_customers").update({
        rfm_recency: scores.r,
        rfm_frequency: scores.f,
        rfm_monetary: scores.m,
        rfm_score: `${scores.r}${scores.f}${scores.m}`,
      }).eq("id", customer.id)
    );

    if (updates.length >= 20) {
      await Promise.all(updates);
      updates.length = 0;
    }
  }
  if (updates.length) await Promise.all(updates);

  console.log(`RFM scores updated for ${customers.length} customers`);
}

// Process a single chunk: fetch 100 customers from API, upsert, update progress
async function processChunk(
  supabase: any,
  accessToken: string,
  storeId: string,
  page: number,
  jobId: string,
  cumulativeSynced: number,
  cumulativeErrors: number,
  cumulativeTotal: number
): Promise<{ synced: number; errors: number; total: number; hasMore: boolean }> {
  const perPage = 100;
  const customers = await fetchCustomersPage(accessToken, storeId, page, perPage);

  if (!customers.length) {
    return { synced: cumulativeSynced, errors: cumulativeErrors, total: cumulativeTotal, hasMore: false };
  }

  const customerRecords = customers
    .map((c) => {
      const phone = cleanPhone(c.phone);
      const email = c.email || null;
      if (!phone && !email) return null;

      return {
        phone,
        email,
        name: c.name || "Cliente",
        source: "nuvemshop",
        total_spent: parseFloat(c.total_spent || "0"),
        order_count: c.orders_count || 0,
        city: c.billing_city || null,
        state: c.billing_province || null,
        region: getRegion(c.billing_province),
        metadata: { nuvemshop_customer_id: c.id },
      };
    })
    .filter(Boolean);

  const { synced, errors } = await upsertCustomerBatch(supabase, customerRecords);
  const newSynced = cumulativeSynced + synced;
  const newErrors = cumulativeErrors + errors;
  const newTotal = cumulativeTotal + customers.length;

  // Update progress
  await supabase.from("import_batches").update({
    total_rows: newTotal,
    valid_rows: newSynced,
    invalid_rows: newErrors,
    status: "processing",
  }).eq("id", jobId);

  console.log(`Page ${page}: ${customers.length} fetched, ${synced} synced, ${errors} errors | Total: ${newSynced}/${newTotal}`);

  const hasMore = customers.length >= perPage;
  return { synced: newSynced, errors: newErrors, total: newTotal, hasMore };
}

async function processSync(supabase: any, jobId: string) {
  try {
    const accessToken = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN")!;
    const storeId = Deno.env.get("NUVEMSHOP_STORE_ID")!;

    let page = 1;
    let synced = 0, errors = 0, total = 0;
    const maxPages = 200; // safety limit

    while (page <= maxPages) {
      const result = await processChunk(supabase, accessToken, storeId, page, jobId, synced, errors, total);
      synced = result.synced;
      errors = result.errors;
      total = result.total;

      if (!result.hasMore) break;
      page++;
      // Small delay between pages to avoid rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }

    if (total === 0) {
      await supabase.from("import_batches").update({
        status: "failed",
        error_message: "Nenhum cliente encontrado na Nuvemshop",
      }).eq("id", jobId);
      return;
    }

    // Enrich from local nuvemshop_orders for purchase dates
    console.log("Enriching from local orders...");
    const { data: customersNoDates } = await supabase
      .from("imported_customers")
      .select("id, phone")
      .is("first_purchase_at", null)
      .not("phone", "is", null)
      .eq("source", "nuvemshop")
      .limit(1000);

    if (customersNoDates?.length) {
      console.log(`Enriching ${customersNoDates.length} customers from local orders...`);
      const enrichUpdates: Promise<any>[] = [];

      for (const cust of customersNoDates) {
        const { data: orders } = await supabase
          .from("nuvemshop_orders")
          .select("order_date, total")
          .or(`customer_phone.eq.${cust.phone},customer_phone.like.%${cust.phone.slice(-8)}%`)
          .order("order_date", { ascending: true });

        if (orders?.length) {
          enrichUpdates.push(
            supabase.from("imported_customers").update({
              first_purchase_at: orders[0].order_date,
              last_purchase_at: orders[orders.length - 1].order_date,
              total_spent: orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0),
              order_count: orders.length,
            }).eq("id", cust.id)
          );
        }

        if (enrichUpdates.length >= 20) {
          await Promise.all(enrichUpdates);
          enrichUpdates.length = 0;
        }
      }
      if (enrichUpdates.length) await Promise.all(enrichUpdates);
    }

    // Calculate RFM scores
    await calculateRFMScores(supabase);

    await supabase.from("import_batches").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_rows: total,
      valid_rows: synced,
      invalid_rows: errors,
    }).eq("id", jobId);

    console.log(`Sync complete: ${synced} synced, ${errors} errors out of ${total} total`);
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
        message: "Sincronização iniciada (100 por vez). Aguarde...",
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
