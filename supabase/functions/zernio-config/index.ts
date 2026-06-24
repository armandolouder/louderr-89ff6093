import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY");
const ZERNIO_BASE = "https://zernio.com/api/v1";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAuthUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await userClient.auth.getUser();
  return data.user?.id ?? null;
}

async function zernioFetch(path: string, init?: RequestInit) {
  const resp = await fetch(`${ZERNIO_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ZERNIO_API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await resp.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: resp.ok, status: resp.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    if (!ZERNIO_API_KEY) {
      return json(200, { success: false, connected: false, error: "ZERNIO_API_KEY não configurada" });
    }

    const userId = await getAuthUserId(req);
    if (!userId) return json(401, { success: false, error: "Não autenticado" });

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? "status";

    // List Instagram accounts connected on Zernio
    const accountsResp = await zernioFetch("/accounts");
    if (!accountsResp.ok) {
      return json(200, {
        success: false,
        connected: false,
        error: `Falha ao consultar Zernio (${accountsResp.status})`,
        details: accountsResp.data,
      });
    }

    const raw = accountsResp.data as any;
    const allAccounts: any[] = Array.isArray(raw?.accounts) ? raw.accounts : Array.isArray(raw?.data) ? raw.data : [];
    const igAccounts = allAccounts
      .filter((a) => (a.platform ?? "").toLowerCase() === "instagram")
      .map((a) => ({
        accountId: a._id ?? a.id ?? a.accountId,
        username: a.username ?? a.name ?? a.displayName ?? null,
        profileId: a.profileId ?? a.profile_id ?? null,
      }));

    if (action === "select") {
      const accountId = body?.accountId as string | undefined;
      if (!accountId) return json(400, { success: false, error: "accountId obrigatório" });
      const selected = igAccounts.find((a) => a.accountId === accountId);
      if (!selected) return json(404, { success: false, error: "Conta não encontrada na Zernio" });

      await admin.from("zernio_accounts").upsert(
        {
          user_id: userId,
          account_id: selected.accountId,
          username: selected.username,
          profile_id: selected.profileId,
          connected: true,
        },
        { onConflict: "user_id,account_id" },
      );
    }

    const { data: saved } = await admin
      .from("zernio_accounts")
      .select("account_id, username, profile_id, connected")
      .eq("user_id", userId);

    return json(200, {
      success: true,
      connected: (saved?.length ?? 0) > 0,
      accounts: igAccounts,
      savedAccounts: saved ?? [],
    });
  } catch (err) {
    console.error("[zernio-config] error", err);
    return json(200, { success: false, connected: false, error: "Erro de conexão" });
  }
});