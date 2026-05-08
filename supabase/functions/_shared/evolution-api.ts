 export function sendEvolutionReaction(params: {
   phone: string;
   emoji: string;
   messageId: string;
   isFromMe?: boolean;
 }): Promise<EvolutionApiResult> {
   return postToEvolution("/message/sendReaction/{instance}", {
     number: digitsOnly(params.phone),
     reactionMessage: {
       key: {
         id: params.messageId,
         fromMe: params.isFromMe ?? false,
         remoteJid: `${digitsOnly(params.phone)}@s.whatsapp.net`
       },
       reaction: params.emoji
     }
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
   const instance = Deno.env.get("EVOLUTION_INSTANCE_NAME");
   
   if (!serverUrl || !apiKey || !instance) {
     throw new Error("Evolution API credentials not configured (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME)");
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
    // If serverUrl contains zapconnect/api, it might be a relay/proxy that expects Uazapi-style JSON
    const serverUrl = Deno.env.get("EVOLUTION_API_URL") || "";
    const isZapConnect = serverUrl.includes("zapconnect");

    if (isZapConnect) {
      console.log("Relay/Proxy detected (zapconnect), using simplified JSON format");
      return postToEvolution("/message/sendText/{instance}", {
        number: digitsOnly(phone),
        text: text
      });
    }

    return postToEvolution("/message/sendText/{instance}", {
      number: digitsOnly(phone),
      options: {
        delay: 1200,
        presence: "composing",
        linkPreview: false
      },
      textMessage: {
        text: text
      }
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
     options: {
       delay: 1200,
       presence: "composing"
     },
     mediaMessage: {
       mediatype: mediaTypeMap[params.mediaType] || "image",
       caption: params.caption || "",
       media: params.fileUrl
     }
   });
 }
 
 export function hasEvolutionCredentials(): boolean {
   return Boolean(
     Deno.env.get("EVOLUTION_API_URL") && 
     Deno.env.get("EVOLUTION_API_KEY") && 
     Deno.env.get("EVOLUTION_INSTANCE_NAME")
   );
 }