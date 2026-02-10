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
  first_order_id?: number;
  last_order_id?: number;
  billing_address?: string;
  billing_city?: string;
  billing_province?: string;
  billing_country?: string;
  created_at: string;
  updated_at: string;
}

// Map Brazilian states to regions
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
  // Try direct state code match
  if (STATE_TO_REGION[upper]) return STATE_TO_REGION[upper];
  // Try extracting 2-letter code from end (e.g. "São Paulo - SP")
  const match = upper.match(/\b([A-Z]{2})$/);
  if (match && STATE_TO_REGION[match[1]]) return STATE_TO_REGION[match[1]];
  return null;
}

async function fetchAllCustomers(
  accessToken: string,
  storeId: string
): Promise<NuvemshopCustomer[]> {
  const allCustomers: NuvemshopCustomer[] = [];
  let page = 1;
  const perPage = 200; // max allowed
  const maxPages = 100; // safety limit

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
      const errorText = await response.text();
      console.error(`API error page ${page}: ${response.status} - ${errorText}`);
      // If rate limited, wait and retry
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

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  return allCustomers;
}

async function fetchCustomerOrders(
  accessToken: string,
  storeId: string,
  customerId: number
): Promise<{ totalSpent: number; orderCount: number; firstPurchase: string | null; lastPurchase: string | null }> {
  // We'll use the orders endpoint filtered by customer
  const url = `${API_BASE}/${storeId}/orders?customer_id=${customerId}&per_page=200`;

  const response = await fetch(url, {
    headers: {
      Authentication: `bearer ${accessToken.trim()}`,
      "User-Agent": "LOUDER.ink (allvisualweb@gmail.com)",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) return { totalSpent: 0, orderCount: 0, firstPurchase: null, lastPurchase: null };

  const orders = await response.json();
  let totalSpent = 0;
  let orderCount = 0;
  let firstPurchase: string | null = null;
  let lastPurchase: string | null = null;

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

async function processSync(supabase: any, jobId: string) {
  try {
    const accessToken = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN")!;
    const storeId = Deno.env.get("NUVEMSHOP_STORE_ID")!;

    // 1. Fetch all customers from Nuvemshop API
    console.log("Fetching all customers from Nuvemshop...");
    const customers = await fetchAllCustomers(accessToken, storeId);
    console.log(`Total customers fetched: ${customers.length}`);

    if (customers.length === 0) {
      await supabase.from("import_batches").update({
        status: "failed",
        error_message: "Nenhum cliente encontrado na Nuvemshop",
      }).eq("id", jobId);
      return;
    }

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    // 2. Process in batches
    const batchSize = 50;
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);

      const upsertData = batch.map((c) => {
        const phone = cleanPhone(c.phone);
        const totalSpent = parseFloat(c.total_spent || "0");
        const region = getRegion(c.billing_province);

        return {
          phone,
          email: c.email || null,
          name: c.name || "Cliente",
          source: "nuvemshop",
          total_spent: totalSpent,
          order_count: c.orders_count || 0,
          city: c.billing_city || null,
          state: c.billing_province || null,
          region,
          metadata: { nuvemshop_customer_id: c.id },
        };
      }).filter((c) => c.phone || c.email); // Must have at least one contact

      if (!upsertData.length) {
        skipped += batch.length;
        continue;
      }

      // Check existing by phone or email to avoid duplicates
      for (const customer of upsertData) {
        try {
          let existingQuery = supabase.from("imported_customers").select("id, total_spent, order_count");

          if (customer.phone) {
            const { data: existing } = await existingQuery.eq("phone", customer.phone).maybeSingle();

            if (existing) {
              // Update existing record with latest data
              await supabase.from("imported_customers").update({
                name: customer.name,
                email: customer.email,
                total_spent: customer.total_spent,
                order_count: customer.order_count,
                city: customer.city,
                state: customer.state,
                region: customer.region,
                source: "nuvemshop",
                metadata: customer.metadata,
              }).eq("id", existing.id);
              synced++;
              continue;
            }
          }

          if (customer.email) {
            const { data: existing } = await supabase
              .from("imported_customers")
              .select("id")
              .eq("email", customer.email)
              .maybeSingle();

            if (existing) {
              await supabase.from("imported_customers").update({
                name: customer.name,
                phone: customer.phone,
                total_spent: customer.total_spent,
                order_count: customer.order_count,
                city: customer.city,
                state: customer.state,
                region: customer.region,
                source: "nuvemshop",
                metadata: customer.metadata,
              }).eq("id", existing.id);
              synced++;
              continue;
            }
          }

          // Insert new customer
          const { error } = await supabase.from("imported_customers").insert(customer);
          if (error) {
            console.error(`Insert error for ${customer.name}:`, error.message);
            errors++;
          } else {
            synced++;
          }
        } catch (e) {
          console.error(`Error processing customer:`, e);
          errors++;
        }
      }

      // Update progress
      await supabase.from("import_batches").update({
        valid_rows: synced,
        invalid_rows: errors,
        total_rows: customers.length,
      }).eq("id", jobId);

      console.log(`Progress: ${synced} synced, ${errors} errors, batch ${Math.floor(i / batchSize) + 1}`);
    }

    // 3. Now enrich with order dates from nuvemshop_orders table (already synced data)
    console.log("Enriching with order date data from existing orders...");
    const { error: enrichError } = await supabase.rpc("enrich_customer_dates_from_orders").catch(() => ({ error: null }));
    
    // Fallback: do it manually if RPC doesn't exist
    if (enrichError) {
      console.log("RPC not available, enriching manually...");
      // Get customers without purchase dates that have phones
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
            .select("order_date, total, event")
            .or(`customer_phone.eq.${cust.phone},customer_phone.like.%${cust.phone.slice(-8)}%`)
            .neq("event", "order/cancelled")
            .order("order_date", { ascending: true });

          if (orders?.length) {
            const totalSpent = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);
            await supabase.from("imported_customers").update({
              first_purchase_at: orders[0].order_date,
              last_purchase_at: orders[orders.length - 1].order_date,
              total_spent: totalSpent,
              order_count: orders.length,
            }).eq("id", cust.id);
          }
        }
      }
    }

    // Mark job complete
    await supabase.from("import_batches").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_rows: customers.length,
      valid_rows: synced,
      invalid_rows: errors,
    }).eq("id", jobId);

    console.log(`Sync complete: ${synced} synced, ${skipped} skipped, ${errors} errors out of ${customers.length} total`);
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

    // Check status
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

    // Create job
    const { data: job, error: jobError } = await supabase
      .from("import_batches")
      .insert({ filename: "nuvemshop_customers_sync", status: "processing", total_rows: 0 })
      .select()
      .single();

    if (jobError) throw jobError;

    // Start background processing
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
        message: "Sincronização de clientes Nuvemshop iniciada. Aguarde...",
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
