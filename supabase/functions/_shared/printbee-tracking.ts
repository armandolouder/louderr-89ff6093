import { z } from "npm:zod@3";

export const orderIdentifierSchema = z.string().trim().toUpperCase().regex(/^(?:BEE)?\d{1,8}$/, "Informe um pedido como BEE00004696.").transform(value => `BEE${value.replace(/^BEE/, "").padStart(8, "0")}`);
const text = z.string().max(2000).nullable().optional().transform(value => value || null);
export const trackingSchema = z.object({
  orderNSU: text, orderStatus: text, saleDate: text, deliveryDate: text,
  trackingCode: text, trackingUrl: text, shipmentStatus: text, carrierName: text,
  serviceName: text, postedAt: text, deliveredAt: text, city: text, state: text,
});
export type TrackingData = z.infer<typeof trackingSchema>;

// Explicit projection: recipient names, addresses, contacts and raw payloads never enter shared links.
export function projectTracking(value: unknown): TrackingData {
  const data = trackingSchema.parse(value);
  if (data.trackingUrl) {
    try {
      const url = new URL(data.trackingUrl);
      if (url.protocol !== "https:") data.trackingUrl = null;
    } catch { data.trackingUrl = null; }
  }
  return data;
}