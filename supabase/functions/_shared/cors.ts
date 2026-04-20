/**
 * CORS headers compartilhados entre todas as Edge Functions.
 * Centraliza a configuração para evitar drift entre arquivos.
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
} as const;

/**
 * Resposta padrão para preflight requests (OPTIONS).
 */
export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Cria uma resposta JSON com headers CORS já aplicados.
 */
export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}