import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse } from "./cors.ts";

export interface AuthResult {
  userId: string;
  authHeader: string;
  client: SupabaseClient;
}

/**
 * Verifica o JWT do usuário a partir do header Authorization.
 * Retorna `{ ok: false, response }` com 401 se inválido — o caller deve apenas devolver `response`.
 * Retorna `{ ok: true, auth }` com o `userId` e um client Supabase com contexto do usuário.
 */
export async function verifyUserJwt(
  req: Request,
): Promise<
  | { ok: true; auth: AuthResult }
  | { ok: false; response: Response }
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: jsonResponse({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return { ok: false, response: jsonResponse({ error: "Server misconfigured" }, { status: 500 }) };
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return { ok: false, response: jsonResponse({ error: "Unauthorized" }, { status: 401 }) };
  }

  return {
    ok: true,
    auth: { userId: data.claims.sub as string, authHeader, client },
  };
}

/**
 * Cria um client Supabase com privilégios de service-role.
 * Use apenas em Edge Functions, nunca expor ao cliente.
 */
export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Supabase credentials not configured");
  }
  return createClient(url, key);
}