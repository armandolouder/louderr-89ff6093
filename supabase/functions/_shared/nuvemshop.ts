import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface NuvemshopCreds {
  storeId: string;
  accessToken: string;
  source: "db" | "secret";
}

/**
 * Obtém as credenciais da Nuvemshop.
 * Prioriza a conexão OAuth salva no banco (nuvemshop_credentials) e,
 * como fallback, usa os secrets de ambiente (compatibilidade com o fluxo antigo).
 */
export async function getNuvemshopCredentials(
  supabase: SupabaseClient,
): Promise<NuvemshopCreds> {
  const { data } = await supabase
    .from("nuvemshop_credentials")
    .select("store_id, access_token")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.access_token && data?.store_id) {
    return { storeId: data.store_id, accessToken: data.access_token, source: "db" };
  }

  const accessToken = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN")?.trim();
  const storeId = Deno.env.get("NUVEMSHOP_STORE_ID");
  if (!accessToken || !storeId) {
    throw new Error(
      "Nuvemshop não conectada. Reinstale o app pela tela de APIs para gerar um novo token.",
    );
  }
  return { storeId, accessToken, source: "secret" };
}

export const NUVEMSHOP_USER_AGENT = "LOUDER.ink (allvisualweb@gmail.com)";