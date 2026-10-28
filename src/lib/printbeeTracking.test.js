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
  test("shared tracking excludes recipient contact and street address", () => {
    const data = projectTracking({ orderNSU: "BEE00004696", recipientEmail: "private@example.test", recipientName: "Private", street: "Private address", trackingCode: "LGI-EXAMPLE", city: "São Paulo" });
    expect(data).not.toHaveProperty("recipientEmail");
    expect(data).not.toHaveProperty("recipientName");
    expect(data).not.toHaveProperty("street");
    expect(data.trackingCode).toBe("LGI-EXAMPLE");
  });
  test("rejects unsafe carrier links", () => {
    expect(projectTracking({ trackingUrl: "javascript:alert(1)" }).trackingUrl).toBeNull();
  });
});