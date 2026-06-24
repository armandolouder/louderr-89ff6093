 export function sendEvolutionReaction(params: {
   phone: string;
   emoji: string;
   messageId: string;
   isFromMe?: boolean;
 }): Promise<EvolutionApiResult> {
   return postToEvolution("/message/sendReaction/{instance}", {
    key: {
      id: params.messageId,
      fromMe: params.isFromMe ?? false,
      remoteJid: `${digitsOnly(params.phone)}@s.whatsapp.net`
    },
    reaction: params.emoji
   });
 }
 import { digitsOnly } from "./phone.ts";
 
 export interface EvolutionApiResult {
   ok: boolean;
   status: number;
   data: any;
   raw: string;
 }
 
 function getCredentials() {
   const serverUrl = Deno.env.get("EVOLUTION_API_URL");
   const apiKey = Deno.env.get("EVOLUTION_API_KEY");
    const instance = Deno.env.get("EVOLUTION_ACTIVE_INSTANCE") || Deno.env.get("EVOLUTION_INSTANCE_NAME");
   
   if (!serverUrl || !apiKey || !instance) {
      throw new Error("Evolution API credentials not configured (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_ACTIVE_INSTANCE/EVOLUTION_INSTANCE_NAME)");
   }
   
   return { 
     serverUrl: serverUrl.endsWith("/") ? serverUrl.slice(0, -1) : serverUrl, 
     apiKey, 
     instance 
   };
 }
 
  async function postToEvolution(path: string, body: Record<string, any>): Promise<EvolutionApiResult> {
    const { serverUrl, apiKey, instance } = getCredentials();
    const fullUrl = `${serverUrl}${path.replace("{instance}", instance)}`;
    
    console.log(`Evolution API Request: POST ${fullUrl}`);
  
    const res = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify(body),
    });
  
    const raw = await res.text();
    console.log(`Evolution API Response [${res.status}]: ${raw.substring(0, 500)}`);
   let data: any;
   try {
     data = JSON.parse(raw);
   } catch {
     data = { raw };
   }
 
   return { ok: res.ok, status: res.status, data, raw };
 }
 
    export function sendEvolutionText(phone: string, text: string): Promise<EvolutionApiResult> {
      // Evolution API v2 - Strict format based on documentation
      return postToEvolution("/message/sendText/{instance}", {
        number: digitsOnly(phone),
        text: text,
        delay: 1200,
        linkPreview: false
      });
    }
 
 export function sendEvolutionMedia(params: {
   phone: string;
   mediaType: "image" | "video" | "audio" | "document";
   fileUrl: string;
   caption?: string;
 }): Promise<EvolutionApiResult> {
   const mediaTypeMap = {
     image: "image",
     video: "video",
     audio: "audio",
     document: "document"
   };
 
    return postToEvolution("/message/sendMedia/{instance}", {
      number: digitsOnly(params.phone),
      mediatype: mediaTypeMap[params.mediaType] || "image",
      media: params.fileUrl,
      caption: params.caption || "",
      delay: 1200
    });
 }
 
 export function hasEvolutionCredentials(): boolean {
   return Boolean(
     Deno.env.get("EVOLUTION_API_URL") && 
     Deno.env.get("EVOLUTION_API_KEY") && 
      Deno.env.get("EVOLUTION_ACTIVE_INSTANCE") || Deno.env.get("EVOLUTION_INSTANCE_NAME")
   );
 }

 // Downloads (and decrypts) media from a WhatsApp message via Evolution API.
 // Returns the decoded bytes plus mimetype/filename, or null on failure.
 export async function getEvolutionMediaBase64(message: Record<string, any>): Promise<
   { bytes: Uint8Array; mimetype: string; fileName: string } | null
 > {
   try {
     const result = await postToEvolution("/chat/getBase64FromMediaMessage/{instance}", {
       message,
       convertToMp4: false,
     });
     if (!result.ok || !result.data?.base64) {
       console.error(`getBase64FromMediaMessage failed [${result.status}]: ${result.raw.substring(0, 300)}`);
       return null;
     }
     const base64: string = result.data.base64;
     const binary = atob(base64);
     const bytes = new Uint8Array(binary.length);
     for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
     return {
       bytes,
       mimetype: result.data.mimetype || "application/octet-stream",
       fileName: result.data.fileName || "media",
     };
   } catch (e) {
     console.error("getEvolutionMediaBase64 error:", e);
     return null;
   }
 }