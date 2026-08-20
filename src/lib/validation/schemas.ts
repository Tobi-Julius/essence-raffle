/**
 * Shared Zod schemas. These run on BOTH the client (for UX) and inside Cloud
 * Functions (for security). Never assume client validation is sufficient —
 * every schema here is re-validated server-side before any privileged write.
 */
import { z } from "zod";
import {
  ELIGIBILITY_TYPES,
  USER_ROLES,
} from "@/types/firestore";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: emailSchema,
  phoneNumber: phoneSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phoneNumber: phoneSchema,
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ---------------------------------------------------------------------------
// Raffle creation / editing (admin)
// ---------------------------------------------------------------------------

export const raffleBasicInfoSchema = z.object({
  name: z.string().trim().min(3).max(140),
  shortDescription: z.string().trim().min(10).max(280),
  fullDescription: z.string().trim().min(20).max(20000),
});

export const raffleScheduleSchema = z
  .object({
    timezone: z.string().trim().min(1).default("Africa/Lagos"),
    registrationStart: z.coerce.date(),
    registrationEnd: z.coerce.date(),
    drawAt: z.coerce.date(),
  })
  .refine((v) => v.registrationEnd > v.registrationStart, {
    message: "Registration end must be after registration start",
    path: ["registrationEnd"],
  })
  .refine((v) => v.drawAt >= v.registrationEnd, {
    message: "Draw date must be on or after registration close",
    path: ["drawAt"],
  });

export const rafflePaymentSchema = z.object({
  entryFee: z.number().int().positive("Entry fee must be a positive whole amount"),
  currency: z.string().trim().length(3).default("NGN"),
  bankName: z.string().trim().min(2).max(120),
  accountName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().regex(/^[0-9]{6,20}$/, "Enter a valid account number"),
  instructions: z.string().trim().max(2000).default(""),
});

export const raffleEligibilitySchema = z.object({
  type: z.enum(ELIGIBILITY_TYPES),
  groupLabel: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).default(""),
});

export const raffleEntryConfigSchema = z
  .object({
    allowMultipleEntries: z.boolean().default(false),
    maxEntriesPerUser: z.number().int().min(1).max(100).default(1),
  })
  .refine((v) => v.allowMultipleEntries || v.maxEntriesPerUser === 1, {
    message: "Single-entry raffles must cap maxEntriesPerUser at 1",
    path: ["maxEntriesPerUser"],
  });

export const raffleCreateSchema = z.object({
  basicInfo: raffleBasicInfoSchema,
  schedule: raffleScheduleSchema,
  payment: rafflePaymentSchema,
  eligibility: raffleEligibilitySchema,
  entryConfig: raffleEntryConfigSchema,
});
export type RaffleCreateInput = z.infer<typeof raffleCreateSchema>;

export const prizeSchema = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().min(2).max(4000),
  value: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().trim().length(3).nullable().optional(),
});
export type PrizeInput = z.infer<typeof prizeSchema>;

export const termsContentSchema = z.object({
  contentJson: z.record(z.string(), z.unknown()),
  contentHtml: z.string().min(1),
});
export type TermsContentInput = z.infer<typeof termsContentSchema>;

// ---------------------------------------------------------------------------
// Registration / payment (participant)
// ---------------------------------------------------------------------------

export const registerForRaffleSchema = z.object({
  raffleId: z.string().trim().min(1),
  termsId: z.string().trim().min(1),
  termsVersion: z.number().int().positive(),
  termsAccepted: z.literal(true),
});
export type RegisterForRaffleInput = z.infer<typeof registerForRaffleSchema>;

export const ACCEPTED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;
export const MAX_RECEIPT_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export const submitReceiptSchema = z.object({
  paymentId: z.string().trim().min(1),
  receiptPath: z.string().trim().min(1),
  mimeType: z.enum(ACCEPTED_RECEIPT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_RECEIPT_SIZE_BYTES),
});
export type SubmitReceiptInput = z.infer<typeof submitReceiptSchema>;

export const reviewPaymentSchema = z.object({
  paymentId: z.string().trim().min(1),
  decision: z.enum(["approve", "reject"]),
  rejectionReason: z.string().trim().max(500).optional(),
}).refine((v) => v.decision !== "reject" || (v.rejectionReason && v.rejectionReason.length > 0), {
  message: "A rejection reason is required",
  path: ["rejectionReason"],
});
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;

// ---------------------------------------------------------------------------
// Draw / winners (admin)
// ---------------------------------------------------------------------------

export const startDrawSchema = z.object({
  raffleId: z.string().trim().min(1),
  forceEarly: z.boolean().default(false),
});
export type StartDrawInput = z.infer<typeof startDrawSchema>;

export const updateDrawPresentationSchema = z.object({
  raffleId: z.string().trim().min(1),
  presentationState: z.enum(["READY", "DRAWING", "REVEALING", "WINNER_REVEALED", "COMPLETED"]),
});
export type UpdateDrawPresentationInput = z.infer<typeof updateDrawPresentationSchema>;

export const disqualifyWinnerSchema = z.object({
  winnerId: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(500),
});
export type DisqualifyWinnerInput = z.infer<typeof disqualifyWinnerSchema>;

export const redrawSchema = z.object({
  raffleId: z.string().trim().min(1),
});
export type RedrawInput = z.infer<typeof redrawSchema>;

export const claimPrizeSchema = z.object({
  raffleId: z.string().trim().min(1),
  claimNotes: z.string().trim().max(1000).optional(),
  deliveryMethod: z.string().trim().max(140).optional(),
});
export type ClaimPrizeInput = z.infer<typeof claimPrizeSchema>;

// ---------------------------------------------------------------------------
// Admin user management
// ---------------------------------------------------------------------------

export const setUserRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(USER_ROLES),
});
export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;

export const setUserActiveSchema = z.object({
  userId: z.string().trim().min(1),
  isActive: z.boolean(),
});
export type SetUserActiveInput = z.infer<typeof setUserActiveSchema>;
