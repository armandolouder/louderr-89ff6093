 import { sendEvolutionText, sendEvolutionMedia, hasEvolutionCredentials, sendEvolutionReaction } from "./evolution-api.ts";
 
 export type WhatsAppProvider = "evolution";
 
 export interface WhatsAppResult {
   ok: boolean;
   status: number;
   data: any;
   raw: string;
 }
 
 export function getActiveProvider(): WhatsAppProvider {
   return "evolution";
 }
 
 export async function sendWhatsAppText(phone: string, text: string): Promise<WhatsAppResult> {
   const result = await sendEvolutionText(phone, text);
   return { ok: result.ok, status: result.status, data: result.data, raw: result.raw };
 }
 
 export async function sendWhatsAppMedia(params: {
   phone: string;
   mediaType: "image" | "video" | "audio" | "document";
   fileUrl: string;
   caption?: string;
 }): Promise<WhatsAppResult> {
   const result = await sendEvolutionMedia(params);
   return { ok: result.ok, status: result.status, data: result.data, raw: result.raw };
 }
 
 export async function sendWhatsAppReaction(params: {
   phone: string;
   emoji: string;
   messageId: string;
   isFromMe?: boolean;
 }): Promise<WhatsAppResult> {
   const result = await sendEvolutionReaction(params);
   return { ok: result.ok, status: result.status, data: result.data, raw: result.raw };
 }
 
 export function hasWhatsAppCredentials(): boolean {
   return hasEvolutionCredentials();
 }