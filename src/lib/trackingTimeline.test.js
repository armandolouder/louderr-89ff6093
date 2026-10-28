import { describe, test, expect } from "bun:test";
import { trackingStages } from "./trackingTimeline";

const order = { orderNSU: "BEE00004696", orderStatus: "PRODUCTION", saleDate: "2026-10-23T15:32:00-03:00", deliveryDate: null, trackingCode: null, trackingUrl: null, shipmentStatus: null, carrierName: null, serviceName: null, postedAt: null, deliveredAt: null, city: null, state: null };
describe("Etapa de coleta após cinco dias", () => {
  test("não ativa antes de cinco dias corridos", () => {
    expect(trackingStages(order, Date.parse("2026-10-28T15:31:59-03:00")).collection).toBe(false);
  });
  test("ativa no quinto dia mesmo sem evento da transportadora", () => {
    const stages = trackingStages(order, Date.parse("2026-10-28T15:32:00-03:00"));
    expect(stages.collection).toBe(true);
    expect(stages.automaticCollection).toBe(true);
    expect(stages.collectionDueAt).toBe("2026-10-28T18:32:00.000Z");
    expect(stages.dispatched).toBe(false);
  });
  test("pedido cancelado não recebe indicação automática de coleta", () => {
    expect(trackingStages({ ...order, orderStatus: "CANCELED" }, Date.parse("2026-11-01")).collection).toBe(false);
  });
  test("postagem real prevalece sobre a etapa automática", () => {
    const stages = trackingStages({ ...order, postedAt: "2026-10-27T12:00:00-03:00" }, Date.parse("2026-10-28T18:32:00Z"));
    expect(stages.automaticCollection).toBe(false);
    expect(stages.dispatched).toBe(true);
  });
  test("data ausente não cria prazo fictício", () => {
    expect(trackingStages({ ...order, saleDate: null }, Date.parse("2026-11-01")).collection).toBe(false);
  });
  test("datas sem fuso usam horário brasileiro", () => {
    expect(trackingStages({ ...order, saleDate: "2026-10-23T15:32:00" }, Date.parse("2026-10-28T18:32:00Z")).collectionDueAt).toBe("2026-10-28T18:32:00.000Z");
  });
});