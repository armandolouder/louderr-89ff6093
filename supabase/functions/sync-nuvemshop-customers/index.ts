import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_BASE = "https://api.tiendanube.com/v1";
const SYNC_FILENAME = "nuvemshop_customers_sync";
const CHUNK_SIZE = 100;

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

interface JobState {
  next_page?: number;
  phase?: "sync" | "finalizing" | "completed" | "cancelled";
}

const STATE_TO_REGION: Record<string, string> = {
  // Siglas
  AC: "Norte", AP: "Norte", AM: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

const STATE_NAME_TO_REGION: Record<string, string> = {
  "acre": "Norte", "amapá": "Norte", "amazonas": "Norte", "pará": "Norte", "rondônia": "Norte", "roraima": "Norte", "tocantins": "Norte",
  "alagoas": "Nordeste", "bahia": "Nordeste", "ceará": "Nordeste", "maranhão": "Nordeste", "paraíba": "Nordeste",
  "pernambuco": "Nordeste", "piauí": "Nordeste", "rio grande do norte": "Nordeste", "sergipe": "Nordeste",
  "distrito federal": "Centro-Oeste", "goiás": "Centro-Oeste", "mato grosso": "Centro-Oeste", "mato grosso do sul": "Centro-Oeste",
  "espírito santo": "Sudeste", "minas gerais": "Sudeste", "rio de janeiro": "Sudeste", "são paulo": "Sudeste",
  "paraná": "Sul", "rio grande do sul": "Sul", "santa catarina": "Sul",
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function getRegion(province: string | null | undefined): string | null {
  if (!province) return null;
  const trimmed = province.trim();
  const upper = trimmed.toUpperCase();
  if (STATE_TO_REGION[upper]) return STATE_TO_REGION[upper];
  const lower = trimmed.toLowerCase();
  if (STATE_NAME_TO_REGION[lower]) return STATE_NAME_TO_REGION[lower];
  const match = upper.match(/\b([A-Z]{2})$/);
  if (match && STATE_TO_REGION[match[1]]) return STATE_TO_REGION[match[1]];
  return null;
}

function parseJobState(value: unknown): JobState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const state = value as Record<string, unknown>;
  return {
    next_page: typeof state.next_page === "number" ? state.next_page : undefined,
    phase: typeof state.phase === "string" ? (state.phase as JobState["phase"]) : undefined,
  };
}

function isValidUuid(value: string | null): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function fetchJob(supabase: any, jobId: string) {
  const { data, error } = await supabase
    .from("import_batches")
    .select("id, status, error_message, total_rows, valid_rows, invalid_rows, completed_at, column_mapping")
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchCustomersPage(
  accessToken: string,
  storeId: string,
  page: number,
  perPage: number,
): Promise<NuvemshopCustomer[]> {
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
      await new Promise((resolve) => setTimeout(resolve, 3000));
      continue;
    }

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Erro ao buscar página ${page}: ${response.status} ${details}`);
    }

    return await response.json();
  }

  throw new Error(`Limite de tentativas excedido ao buscar página ${page}`);
}

type ImportedCustomerMatch = {
  id: string;
  metadata?: Record<string, unknown> | null;
};

function getNuvemshopCustomerId(customer: Record<string, any>): string | null {
  const value = customer.metadata?.nuvemshop_customer_id;
  return value === undefined || value === null ? null : String(value);
}

function pickMergeableMatch(
  matches: ImportedCustomerMatch[] | null | undefined,
  currentNuvemshopId: string | null,
) {
  if (!matches?.length) return null;

  return matches.find((match) => {
    const existingNuvemshopId = match.metadata?.nuvemshop_customer_id;
    return (
      existingNuvemshopId === undefined ||
      existingNuvemshopId === null ||
      String(existingNuvemshopId) === currentNuvemshopId
    );
  }) ?? null;
}

async function findExistingCustomerId(supabase: any, customer: Record<string, any>) {
  const nuvemshopCustomerId = getNuvemshopCustomerId(customer);
  const metadataCustomerId = customer.metadata?.nuvemshop_customer_id;

  if (metadataCustomerId !== undefined && metadataCustomerId !== null) {
    const { data, error } = await supabase
      .from("imported_customers")
      .select("id, metadata")
      .contains("metadata", { nuvemshop_customer_id: metadataCustomerId })
      .limit(1);

    if (error) throw error;
    if (data?.[0]?.id) return data[0].id as string;
  }

  if (customer.email) {
    const { data, error } = await supabase
      .from("imported_customers")
      .select("id, metadata")
      .ilike("email", customer.email)
      .limit(5);

    if (error) throw error;

    const match = pickMergeableMatch(data as ImportedCustomerMatch[] | null, nuvemshopCustomerId);
    if (match?.id) return match.id;
  }

  if (customer.phone) {
    const { data, error } = await supabase
      .from("imported_customers")
      .select("id, metadata")
      .eq("phone", customer.phone)
      .limit(5);

    if (error) throw error;

    const match = pickMergeableMatch(data as ImportedCustomerMatch[] | null, nuvemshopCustomerId);
    if (match?.id) return match.id;
  }

  return null;
}

async function upsertCustomerBatch(supabase: any, customers: Record<string, any>[]) {
  let synced = 0;
  let errors = 0;

  for (const customer of customers) {
    try {
      const existingId = await findExistingCustomerId(supabase, customer);

      if (existingId) {
        const { error } = await supabase
          .from("imported_customers")
          .update(customer)
          .eq("id", existingId);

        if (error) throw error;
        synced++;
        continue;
      }

      const { error } = await supabase.from("imported_customers").insert({ ...customer, user_id: ownerUserId });
      if (error) throw error;
      synced++;
    } catch (error) {
      errors++;
      console.error("Upsert customer error:", error, customer?.email ?? customer?.phone ?? "unknown");
    }
  }

  return { synced, errors };
}

async function calculateRFMScores(supabase: any) {
  console.log("Calculating RFM scores via SQL function...");
  const { error } = await supabase.rpc("calculate_rfm_scores");
  if (error) {
    console.error("RFM calculation error:", error);
    throw error;
  }
  console.log("RFM scores updated successfully");
}

async function finalizeJob(
  supabase: any,
  jobId: string,
  totals: { synced: number; errors: number; total: number },
) {
  const job = await fetchJob(supabase, jobId);
  const state = parseJobState(job?.column_mapping);

  await supabase
    .from("import_batches")
    .update({
      status: "finalizing",
      total_rows: totals.total,
      valid_rows: totals.synced,
      invalid_rows: totals.errors,
      error_message: null,
      column_mapping: { ...state, phase: "finalizing" },
    })
    .eq("id", jobId);

  // Use fast SQL function for RFM calculation
  await calculateRFMScores(supabase);

  await supabase
    .from("import_batches")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_rows: totals.total,
      valid_rows: totals.synced,
      invalid_rows: totals.errors,
      error_message: null,
      column_mapping: { ...state, phase: "completed" },
    })
    .eq("id", jobId);

  console.log(`Sync complete: ${totals.synced} synced, ${totals.errors} errors out of ${totals.total} total`);

  return await fetchJob(supabase, jobId);
}

async function markJobFailed(supabase: any, jobId: string, message: string) {
  const job = await fetchJob(supabase, jobId);
  const state = parseJobState(job?.column_mapping);

  await supabase
    .from("import_batches")
    .update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
      column_mapping: { ...state, phase: state.phase ?? "sync" },
    })
    .eq("id", jobId);

  return await fetchJob(supabase, jobId);
}

async function processNextChunk(supabase: any, accessToken: string, storeId: string, job: any) {
  const state = parseJobState(job.column_mapping);
  const page = state.next_page && state.next_page > 0
    ? state.next_page
    : Math.floor((Number(job.total_rows || 0) / CHUNK_SIZE)) + 1;

  const currentTotals = {
    synced: Number(job.valid_rows || 0),
    errors: Number(job.invalid_rows || 0),
    total: Number(job.total_rows || 0),
  };

  const customers = await fetchCustomersPage(accessToken, storeId, page, CHUNK_SIZE);

  if (!customers.length) {
    if (currentTotals.total === 0) {
      return await markJobFailed(supabase, job.id, "Nenhum cliente encontrado na Nuvemshop");
    }

    return await finalizeJob(supabase, job.id, currentTotals);
  }

  const customerRecords = customers
    .map((customer): Record<string, any> | null => {
      const phone = cleanPhone(customer.phone);
      const email = customer.email || null;

      if (!phone && !email) return null;

      const hasOrders = (customer.orders_count || 0) > 0;

      return {
        phone,
        email,
        name: customer.name || "Cliente",
        source: "nuvemshop",
        total_spent: Number(customer.total_spent || 0),
        order_count: customer.orders_count || 0,
        city: customer.billing_city || null,
        state: customer.billing_province || null,
        region: getRegion(customer.billing_province),
        first_purchase_at: hasOrders ? customer.created_at : null,
        last_purchase_at: hasOrders ? customer.updated_at : null,
        metadata: { nuvemshop_customer_id: customer.id },
      };
    })
    .filter((customer): customer is Record<string, any> => customer !== null);

  const { synced, errors } = await upsertCustomerBatch(supabase, customerRecords);

  const updatedTotals = {
    synced: currentTotals.synced + synced,
    errors: currentTotals.errors + errors,
    total: currentTotals.total + customers.length,
  };

  const hasMore = customers.length >= CHUNK_SIZE;

  await supabase
    .from("import_batches")
    .update({
      total_rows: updatedTotals.total,
      valid_rows: updatedTotals.synced,
      invalid_rows: updatedTotals.errors,
      status: hasMore ? "processing" : "finalizing",
      error_message: null,
      column_mapping: {
        next_page: page + 1,
        phase: hasMore ? "sync" : "finalizing",
      },
    })
    .eq("id", job.id);

  console.log(`Page ${page}: ${customers.length} fetched, ${synced} synced, ${errors} errors | Total: ${updatedTotals.synced}/${updatedTotals.total}`);

  if (hasMore) {
    return await fetchJob(supabase, job.id);
  }

  return await finalizeJob(supabase, job.id, updatedTotals);
}

async function cancelJob(supabase: any, jobId: string) {
  const job = await fetchJob(supabase, jobId);
  if (!job) return null;

  if (["completed", "failed", "cancelled"].includes(job.status || "")) {
    return job;
  }

  const state = parseJobState(job.column_mapping);

  await supabase
    .from("import_batches")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
      error_message: null,
      column_mapping: { ...state, phase: "cancelled" },
    })
    .eq("id", jobId);

  return await fetchJob(supabase, jobId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accessToken = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN");
    const storeId = Deno.env.get("NUVEMSHOP_STORE_ID");

    if (!supabaseUrl || !supabaseKey || !accessToken || !storeId) {
      return jsonResponse({
        success: false,
        error: "Configuração da integração com a Nuvemshop incompleta",
      }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve owner user_id for multi-tenant data isolation
    const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
    const ownerUserId = ownerData as string | null;
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job_id");
    const action = url.searchParams.get("action");

    if (req.method === "GET") {
      if (!isValidUuid(jobId)) {
        return jsonResponse({ success: false, error: "job_id inválido" }, 400);
      }

      const job = await fetchJob(supabase, jobId);
      if (!job) {
        return jsonResponse({ success: false, error: "Sincronização não encontrada" }, 404);
      }

      return jsonResponse({ success: true, job_id: job.id, ...job });
    }

    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Método não permitido" }, 405);
    }

    if (action === "cancel") {
      if (!isValidUuid(jobId)) {
        return jsonResponse({ success: false, error: "job_id inválido" }, 400);
      }

      const job = await cancelJob(supabase, jobId);
      if (!job) {
        return jsonResponse({ success: false, error: "Sincronização não encontrada" }, 404);
      }

      return jsonResponse({ success: true, job_id: job.id, ...job, message: "Sincronização cancelada" });
    }

    if (jobId) {
      if (!isValidUuid(jobId)) {
        return jsonResponse({ success: false, error: "job_id inválido" }, 400);
      }

      const job = await fetchJob(supabase, jobId);
      if (!job) {
        return jsonResponse({ success: false, error: "Sincronização não encontrada" }, 404);
      }

      if (["completed", "failed", "cancelled"].includes(job.status || "")) {
        return jsonResponse({ success: true, job_id: job.id, ...job });
      }

      const updatedJob = await processNextChunk(supabase, accessToken, storeId, job);
      return jsonResponse({ success: true, job_id: updatedJob.id, ...updatedJob });
    }

    const { data: createdJob, error: createError } = await supabase
      .from("import_batches")
      .insert({
        filename: SYNC_FILENAME,
        status: "processing",
        total_rows: 0,
        valid_rows: 0,
        invalid_rows: 0,
        column_mapping: { next_page: 1, phase: "sync" },
        user_id: ownerUserId,
      })
      .select("id, status, error_message, total_rows, valid_rows, invalid_rows, completed_at, column_mapping")
      .single();

    if (createError) throw createError;

    const updatedJob = await processNextChunk(supabase, accessToken, storeId, createdJob);
    return jsonResponse({
      success: true,
      job_id: updatedJob.id,
      ...updatedJob,
      message: "Sincronização iniciada",
    });
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }, 500);
  }
});