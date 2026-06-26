import { digitsOnly } from "./phone.ts";

export type UazapiMediaType = "image" | "video" | "audio" | "document";

export interface UazapiResult {
  ok: boolean;
  status: number;
  data: unknown;
  raw: string;
}

function getCredentials(): { serverUrl: string; token: string } {
  const serverUrl = Deno.env.get("UAZAPI_SERVER_URL");
  const token = Deno.env.get("UAZAPI_INSTANCE_TOKEN");
  if (!serverUrl || !token) {
    throw new Error("UAZAPI credentials not configured");
  }
  return { serverUrl, token };
}

async function postToUazapi(path: string, body: Record<string, unknown>): Promise<UazapiResult> {
  const { serverUrl, token } = getCredentials();

  const res = await fetch(`${serverUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // UAZAPI usa header `token`, NÃO `Authorization: Bearer ...`
      token,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { raw };
  }

  return { ok: res.ok, status: res.status, data, raw };
}

/**
 * Envia mensagem de texto via UAZAPI (`POST /send/text`).
 * O número é automaticamente normalizado para apenas dígitos.
 */
export function sendUazapiText(phone: string, text: string): Promise<UazapiResult> {
  return postToUazapi("/send/text", {
    number: digitsOnly(phone),
    text,
  });
}

/**
 * Envia mídia via UAZAPI (`POST /send/media`).
 * `fileUrl` deve ser uma URL pública/signed acessível pela UAZAPI.
 */
export function sendUazapiMedia(params: {
  phone: string;
  mediaType: UazapiMediaType;
  fileUrl: string;
  caption?: string;
}): Promise<UazapiResult> {
  return postToUazapi("/send/media", {
    number: digitsOnly(params.phone),
    type: params.mediaType,
    file: params.fileUrl,
    text: params.caption ?? "",
  });
}

/**
 * Verifica se as credenciais UAZAPI estão configuradas (sem lançar exceção).
 */
export function hasUazapiCredentials(): boolean {
  return Boolean(Deno.env.get("UAZAPI_SERVER_URL") && Deno.env.get("UAZAPI_INSTANCE_TOKEN"));
}

/**
 * Busca nome e URL da foto de perfil do contato no WhatsApp.
 * UAZAPI: `POST /chat/GetNameAndImageURL` com body `{ number, preview }`.
 */
export function getUazapiProfile(phone: string): Promise<UazapiResult> {
  return postToUazapi("/chat/GetNameAndImageURL", {
    number: digitsOnly(phone),
    preview: false,
  });
}