import { describe, test, expect, mock } from "bun:test";
import { z } from "zod";
mock.module("npm:zod@3", () => ({ z }));
const { orderIdentifierSchema, projectTracking } = await import("../../supabase/functions/_shared/printbee-tracking");

describe("Printbee order tracking", () => {
  test("accepts the user's BEE00004696 order identifier unchanged", () => {
    expect(orderIdentifierSchema.parse("BEE00004696")).toBe("BEE00004696");
  });
  test("accepts the reference's numeric identifier as the same order", () => {
    expect(orderIdentifierSchema.parse("00004696")).toBe("BEE00004696");
  });
  test("rejects input that could change the provider request path", () => {
    expect(orderIdentifierSchema.safeParse("../Orders").success).toBe(false);
  });
  test("shared tracking includes recipient name and street address but excludes private contact email", () => {
    const data = projectTracking({
      orderNSU: "BEE00004696",
      recipientEmail: "private@example.test",
      recipientName: "Maria Silva",
      street: "Rua das Flores",
      number: "123",
      trackingCode: "LGI-EXAMPLE",
      city: "São Paulo",
      state: "SP",
    });
    expect(data).not.toHaveProperty("recipientEmail");
    expect(data.recipientName).toBe("Maria Silva");
    expect(data.street).toBe("Rua das Flores");
    expect(data.number).toBe("123");
    expect(data.trackingCode).toBe("LGI-EXAMPLE");
  });
  test("accepts nested deliveryAddress and recipient object", () => {
    const data = projectTracking({
      orderNSU: "BEE00004696",
      deliveryAddress: {
        street: "Av. Paulista",
        number: "1000",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-100",
      },
      customer: {
        name: "João Santos",
      },
      trackingCode: "BR123456789",
    });
    expect(data.customerName).toBe("João Santos");
    expect(data.street).toBe("Av. Paulista");
    expect(data.district).toBe("Bela Vista");
    expect(data.zipCode).toBe("01310-100");
  });
  test("rejects unsafe carrier links", () => {
    expect(projectTracking({ trackingUrl: "javascript:alert(1)" }).trackingUrl).toBeNull();
  });
});