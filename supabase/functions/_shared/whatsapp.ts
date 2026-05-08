 import { sendUazapiText, sendUazapiMedia, hasUazapiCredentials, UazapiMediaType } from "./uazapi.ts";
 import { sendEvolutionText, sendEvolutionMedia, hasEvolutionCredentials } from "./evolution-api.ts";
 
 export type WhatsAppProvider = "uazapi" | "evolution";
 
 export interface WhatsAppResult {
   ok: boolean;
   status: number;
   data: any;
   raw: string;
 }
 
 export function getActiveProvider(): WhatsAppProvider {
   const provider = Deno.env.get("WHATSAPP_PROVIDER")?.toLowerCase();
   if (provider === "evolution") return "evolution";
   return "uazapi"; // Default to uazapi for backward compatibility
 }
 
 export async function sendWhatsAppText(phone: string, text: string): Promise<WhatsAppResult> {
   const provider = getActiveProvider();
   
   if (provider === "evolution") {
     const result = await sendEvolutionText(phone, text);
     return {
       ok: result.ok,
       status: result.status,
       data: result.data,
       raw: result.raw
     };
   } else {
     const result = await sendUazapiText(phone, text);
     return {
       ok: result.ok,
       status: result.status,
       data: result.data,
       raw: result.raw
     };
   }
 }
 
 export async function sendWhatsAppMedia(params: {
   phone: string;
   mediaType: "image" | "video" | "audio" | "document";
   fileUrl: string;
   caption?: string;
 }): Promise<WhatsAppResult> {
   const provider = getActiveProvider();
   
   if (provider === "evolution") {
     const result = await sendEvolutionMedia(params);
     return {
       ok: result.ok,
       status: result.status,
       data: result.data,
       raw: result.raw
     };
   } else {
     const result = await sendUazapiMedia({
       phone: params.phone,
       mediaType: params.mediaType as UazapiMediaType,
       fileUrl: params.fileUrl,
       caption: params.caption
     });
     return {
       ok: result.ok,
       status: result.status,
       data: result.data,
       raw: result.raw
     };
   }
 }
 
 export function hasWhatsAppCredentials(): boolean {
   const provider = getActiveProvider();
   if (provider === "evolution") return hasEvolutionCredentials();
   return hasUazapiCredentials();
 }