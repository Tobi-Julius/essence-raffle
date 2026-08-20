import { z } from "zod";
import { HttpsError } from "firebase-functions/v2/https";

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpsError("invalid-argument", result.error.issues[0]?.message ?? "Invalid request.");
  }
  return result.data;
}

export const registerForRaffleSchema = z.object({
  raffleId: z.string().min(1),
  termsId: z.string().min(1),
  termsVersion: z.number().int().positive(),
  termsAccepted: z.literal(true),
});

export const submitReceiptSchema = z.object({
  paymentId: z.string().min(1),
  receiptPath: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  sizeBytes: z.number().int().positive().max(8 * 1024 * 1024),
});

export const reviewPaymentSchema = z
  .object({
    paymentId: z.string().min(1),
    decision: z.enum(["approve", "reject"]),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.decision !== "reject" || !!v.rejectionReason, { message: "A rejection reason is required." });

export const raffleIdSchema = z.object({ raffleId: z.string().min(1) });

export const cancelRaffleSchema = z.object({ raffleId: z.string().min(1), reason: z.string().trim().min(3).max(500) });

export const publishTermsSchema = z.object({ raffleId: z.string().min(1), termsId: z.string().min(1) });

export const startDrawSchema = z.object({ raffleId: z.string().min(1), forceEarly: z.boolean().default(false) });

export const updateDrawPresentationSchema = z.object({
  raffleId: z.string().min(1),
  presentationState: z.enum(["READY", "DRAWING", "REVEALING", "WINNER_REVEALED", "COMPLETED"]),
});

export const disqualifyWinnerSchema = z.object({ winnerId: z.string().min(1), reason: z.string().trim().min(3).max(500) });

export const claimPrizeSchema = z.object({
  raffleId: z.string().min(1),
  claimNotes: z.string().trim().max(1000).optional(),
  deliveryMethod: z.string().trim().max(140).optional(),
});

export const setUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["participant", "admin", "super_admin"]),
});

export const setUserActiveSchema = z.object({ userId: z.string().min(1), isActive: z.boolean() });
