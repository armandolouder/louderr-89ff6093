import { z } from "npm:zod@3";

export const orderIdentifierSchema = z.string().trim().toUpperCase().regex(/^(?:BEE)?\d{1,8}$/, "Informe um pedido como BEE00004696.").transform(value => `BEE${value.replace(/^BEE/, "").padStart(8, "0")}`);
const text = z.string().max(2000).nullable().optional().transform(value => value || null);
export const trackingSchema = z.object({
  orderNSU: text,
  orderStatus: text,
  saleDate: text,
  deliveryDate: text,
  trackingCode: text,
  trackingUrl: text,
  shipmentStatus: text,
  carrierName: text,
  serviceName: text,
  postedAt: text,
  deliveredAt: text,
  city: text,
  state: text,
  recipientName: text,
  customerName: text,
  street: text,
  number: text,
  complement: text,
  district: text,
  zipCode: text,
  address: text,
});
export type TrackingData = z.infer<typeof trackingSchema>;

export function projectTracking(value: unknown): TrackingData {
  const val = (value && typeof value === "object") ? (value as Record<string, any>) : {};
  const delivery = (val.deliveryAddress || val.shippingAddress || (typeof val.address === "object" ? val.address : null)) || {};
  const recipient = (val.recipient || val.customer) || {};

  const street = val.street || delivery.street || delivery.address || delivery.logradouro || (typeof val.address === "string" ? val.address : null);
  const number = val.number ? String(val.number) : (delivery.number ? String(delivery.number) : (delivery.numero ? String(delivery.numero) : null));
  const complement = val.complement || delivery.complement || delivery.complemento || delivery.floor || null;
  const district = val.district || val.neighborhood || val.bairro || delivery.district || delivery.neighborhood || delivery.bairro || delivery.locality || null;
  const city = val.city || delivery.city || delivery.cidade || null;
  const state = val.state || delivery.state || delivery.uf || delivery.estado || delivery.province || null;
  const zipCode = val.zipCode ? String(val.zipCode) : (val.postalCode ? String(val.postalCode) : (val.cep ? String(val.cep) : (delivery.zipCode || delivery.postalCode || delivery.cep || delivery.zipcode || null)));

  const recipientName = val.recipientName || val.customerName || recipient.name || recipient.recipientName || delivery.recipientName || delivery.name || [delivery.first_name, delivery.last_name].filter(Boolean).join(" ") || null;
  const customerName = val.customerName || recipientName;

  const data = trackingSchema.parse({
    ...val,
    recipientName,
    customerName,
    street,
    number,
    complement,
    district,
    city,
    state,
    zipCode,
    address: typeof val.address === "string" ? val.address : null,
  });

  if (data.trackingUrl) {
    try {
      const url = new URL(data.trackingUrl);
      if (url.protocol !== "https:") data.trackingUrl = null;
    } catch {
      data.trackingUrl = null;
    }
  }
  return data;
}