import type { PrintbeeTracking } from "./printbeeTracking";

const normalize = (status: string | null) => status?.replace(/[_\s-]/g, "").toUpperCase() || "";
export function trackingTimestamp(value: string | null): number | null {
  if (!value) return null;
  const local = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00-03:00` : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value) ? `${value}-03:00` : value;
  const timestamp = Date.parse(local);
  return Number.isFinite(timestamp) ? timestamp : null;
}
export function trackingStages(tracking: PrintbeeTracking, now = Date.now()) {
  const order = normalize(tracking.orderStatus);
  const shipment = normalize(tracking.shipmentStatus);
  const stopped = ["CANCELED", "CANCELLED", "RETURNED", "LOST"].includes(order) || ["CANCELED", "CANCELLED", "RETURNED", "LOST"].includes(shipment);
  const delivered = Boolean(tracking.deliveredAt) || order === "DELIVERED" || shipment === "DELIVERED";
  const transit = delivered || order === "TRANSIT" || ["TRANSIT", "INTRANSIT"].includes(shipment);
  const dispatched = transit || Boolean(tracking.postedAt);
  const sale = trackingTimestamp(tracking.saleDate);
  const collectionDueAt = sale === null ? null : sale + 5 * 24 * 60 * 60 * 1000;
  const collectionConfirmed = dispatched || ["DISPATCH", "PRODUCTIONCOMPLETED"].includes(order) || shipment === "DISPATCH";
  const automaticCollection = !stopped && !collectionConfirmed && collectionDueAt !== null && now >= collectionDueAt;
  return {
    stopped, delivered, transit, dispatched,
    production: !stopped && (automaticCollection || collectionConfirmed || ["PRODUCTION", "PRODUCTIONQUEUE"].includes(order)),
    collection: !stopped && (collectionConfirmed || automaticCollection),
    automaticCollection,
    collectionDueAt: collectionDueAt === null ? null : new Date(collectionDueAt).toISOString(),
  };
}