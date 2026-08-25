import { describe, expect, it } from "vitest";
import {
  raffleEntryConfigSchema,
  registerSchema,
  reviewPaymentSchema,
  rafflePaymentSchema,
} from "./schemas";

describe("registerSchema", () => {
  it("rejects a password without an uppercase letter or number", () => {
    const result = registerSchema.safeParse({
      fullName: "Jane Doe",
      email: "jane@example.com",
      phoneNumber: "+2348012345678",
      password: "lowercase",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      fullName: "Jane Doe",
      email: "JANE@Example.com",
      phoneNumber: "+2348012345678",
      password: "Password1",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("jane@example.com");
  });
});

describe("raffleEntryConfigSchema", () => {
  it("rejects maxEntriesPerUser > 1 when multiple entries are disallowed", () => {
    const result = raffleEntryConfigSchema.safeParse({ allowMultipleEntries: false, maxEntriesPerUser: 3 });
    expect(result.success).toBe(false);
  });

  it("accepts maxEntriesPerUser > 1 when multiple entries are allowed", () => {
    const result = raffleEntryConfigSchema.safeParse({ allowMultipleEntries: true, maxEntriesPerUser: 5 });
    expect(result.success).toBe(true);
  });
});

describe("rafflePaymentSchema", () => {
  it("rejects a non-positive entry fee", () => {
    const result = rafflePaymentSchema.safeParse({
      entryFee: 0,
      currency: "NGN",
      bankName: "Test Bank",
      accountName: "Essence Store",
      accountNumber: "0123456789",
      instructions: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fractional entry fee (money must be a whole-unit integer)", () => {
    const result = rafflePaymentSchema.safeParse({
      entryFee: 1999.99,
      currency: "NGN",
      bankName: "Test Bank",
      accountName: "Essence Store",
      accountNumber: "0123456789",
      instructions: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("reviewPaymentSchema", () => {
  it("requires a rejection reason when rejecting", () => {
    const result = reviewPaymentSchema.safeParse({ paymentId: "pay_1", decision: "reject" });
    expect(result.success).toBe(false);
  });

  it("allows approval without a reason", () => {
    const result = reviewPaymentSchema.safeParse({ paymentId: "pay_1", decision: "approve" });
    expect(result.success).toBe(true);
  });

  it("accepts a rejection with a reason", () => {
    const result = reviewPaymentSchema.safeParse({
      paymentId: "pay_1",
      decision: "reject",
      rejectionReason: "Receipt is unreadable.",
    });
    expect(result.success).toBe(true);
  });
});
