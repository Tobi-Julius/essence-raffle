/**
 * Domain models for the Essence Store raffle platform.
 *
 * Design notes (deviations from a generic multi-prize raffle):
 * - Each raffle has exactly ONE winner and ONE prize (with optional image + video).
 *   There is no multi-tier prize ranking; `allowMultipleWins` and prize `quantity`
 *   tiers are intentionally absent from this build.
 * - Money is stored as an integer in the minor-less unit of NGN (Naira), i.e. whole
 *   Naira, alongside an explicit `currency` field. Never floats.
 * - All dates are Firestore Timestamps. The raffle's IANA timezone is explicit and
 *   authoritative; the browser clock is never trusted for state decisions.
 */

import type { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

export const USER_ROLES = ["participant", "admin", "super_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const RAFFLE_STATUSES = [
  "DRAFT",
  "UPCOMING",
  "OPEN",
  "DRAWING",
  "COMPLETED",
  "CANCELLED",
] as const;
export type RaffleStatus = (typeof RAFFLE_STATUSES)[number];

export const RAFFLE_STATUS_LABELS: Record<RaffleStatus, string> = {
  DRAFT: "Draft",
  UPCOMING: "Upcoming",
  OPEN: "Present / Open",
  DRAWING: "Drawing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ELIGIBILITY_TYPES = [
  "everyone",
  "employees_only",
  "customers_only",
  "specific_group",
] as const;
export type EligibilityType = (typeof ELIGIBILITY_TYPES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "verification_pending",
  "approved",
  "rejected",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Awaiting your bank transfer",
  verification_pending: "Payment verification pending",
  approved: "Payment approved",
  rejected: "Payment could not be verified",
};

export const REFUND_STATUSES = ["none", "refund_pending", "refunded"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const ENTRY_STATUSES = [
  "payment_pending",
  "verification_pending",
  "eligible",
  "rejected",
  "cancelled",
  "disqualified",
  "winner",
] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  payment_pending: "Payment pending",
  verification_pending: "Payment verification pending",
  eligible: "You're officially entered",
  rejected: "Payment could not be verified",
  cancelled: "Cancelled",
  disqualified: "Disqualified",
  winner: "Winner",
};

export const DRAW_STATUSES = ["pending", "running", "completed", "failed"] as const;
export type DrawStatus = (typeof DRAW_STATUSES)[number];

export const DRAW_PRESENTATION_STATES = [
  "READY",
  "DRAWING",
  "REVEALING",
  "WINNER_REVEALED",
  "COMPLETED",
] as const;
export type DrawPresentationState = (typeof DRAW_PRESENTATION_STATES)[number];

export const WINNER_STATUSES = [
  "pending_verification",
  "verified",
  "disqualified",
  "prize_assigned",
  "claimed",
] as const;
export type WinnerStatus = (typeof WINNER_STATUSES)[number];

export const WINNER_STATUS_LABELS: Record<WinnerStatus, string> = {
  pending_verification: "Pending verification",
  verified: "Verified",
  disqualified: "Disqualified",
  prize_assigned: "Prize assigned",
  claimed: "Claimed",
};

export const PRIZE_STATUSES = ["available", "assigned", "claimed"] as const;
export type PrizeStatus = (typeof PRIZE_STATUSES)[number];

export const TERMS_STATUSES = ["draft", "active", "archived"] as const;
export type TermsStatus = (typeof TERMS_STATUSES)[number];

export const AUDIT_ACTIONS = [
  "RAFFLE_CREATED",
  "RAFFLE_UPDATED",
  "RAFFLE_PUBLISHED",
  "RAFFLE_CANCELLED",
  "TERMS_CREATED",
  "TERMS_UPDATED",
  "TERMS_PUBLISHED",
  "TERMS_ACCEPTED",
  "PRIZE_CREATED",
  "PRIZE_UPDATED",
  "REGISTRATION_CREATED",
  "PAYMENT_SUBMITTED",
  "PAYMENT_APPROVED",
  "PAYMENT_REJECTED",
  "ENTRY_CREATED",
  "ENTRY_APPROVED",
  "ENTRY_DISQUALIFIED",
  "DRAW_STARTED",
  "DRAW_PRESENTATION_UPDATED",
  "WINNER_SELECTED",
  "WINNER_VERIFIED",
  "WINNER_DISQUALIFIED",
  "REDRAW_STARTED",
  "PRIZE_ASSIGNED",
  "PRIZE_CLAIMED",
  "ADMIN_ROLE_CHANGED",
  "USER_DEACTIVATED",
  "USER_REACTIVATED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ---------------------------------------------------------------------------
// Core documents
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  photoURL?: string | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RaffleSchedule {
  timezone: string; // e.g. "Africa/Lagos" — authoritative for all comparisons
  registrationStart: Timestamp;
  registrationEnd: Timestamp;
  drawAt: Timestamp;
}

export interface RafflePayment {
  entryFee: number; // whole Naira, integer, never float
  currency: string; // e.g. "NGN"
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
}

export interface RaffleEligibility {
  type: EligibilityType;
  groupLabel?: string; // used when type === "specific_group"
  description: string;
}

export interface RaffleEntryConfig {
  allowMultipleEntries: boolean;
  maxEntriesPerUser: number; // 1 when allowMultipleEntries is false
}

export interface RaffleStats {
  // Denormalized counters maintained server-side (Cloud Functions) to avoid
  // expensive aggregation reads on every dashboard load.
  totalRegistrations: number;
  paymentsPending: number;
  paymentsApproved: number;
  paymentsRejected: number;
  eligibleEntries: number;
  disqualifiedEntries: number;
}

export interface Raffle {
  id: string;
  name: string;
  nameLower: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  bannerPath?: string | null;
  bannerUrl?: string | null;
  thumbnailPath?: string | null;
  thumbnailUrl?: string | null;
  status: RaffleStatus;
  schedule: RaffleSchedule;
  payment: RafflePayment;
  eligibility: RaffleEligibility;
  entryConfig: RaffleEntryConfig;
  activeTermsId?: string | null;
  activeTermsVersion?: number | null;
  hasWinner: boolean;
  currentWinnerEntryId?: string | null;
  stats: RaffleStats;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Exactly one prize per raffle — doc id equals the raffle id. */
export interface Prize {
  id: string; // === raffleId
  raffleId: string;
  name: string;
  description: string;
  imagePath?: string | null;
  imageUrl?: string | null;
  videoPath?: string | null;
  videoUrl?: string | null;
  value?: number | null;
  currency?: string | null;
  status: PrizeStatus;
  claimedAt?: Timestamp | null;
  claimedBy?: string | null;
  verifiedBy?: string | null;
  claimNotes?: string | null;
  deliveryDate?: Timestamp | null;
  deliveryMethod?: string | null;
  proofOfDeliveryPath?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Rich text stored as sanitized HTML rendered from a Tiptap JSON document. */
export interface RaffleTerms {
  id: string;
  raffleId: string;
  version: number;
  contentJson: Record<string, unknown>; // Tiptap JSON document
  contentHtml: string; // sanitized render, safe to dangerouslySetInnerHTML
  status: TermsStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payment {
  id: string;
  raffleId: string;
  userId: string;
  entryId: string;
  amount: number;
  currency: string;
  paymentMethod: "bank_transfer";
  reference: string;
  receiptPath?: string | null;
  status: PaymentStatus;
  refundStatus: RefundStatus;
  submittedAt?: Timestamp | null;
  reviewedAt?: Timestamp | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RaffleEntry {
  id: string;
  raffleId: string;
  userId: string;
  paymentId: string;
  entryNumber: string; // e.g. RFL-2026-000001
  sequence: number; // numeric part, used for deterministic ordering
  status: EntryStatus;
  isEligible: boolean;
  termsId: string;
  termsVersion: number;
  termsAcceptedAt: Timestamp;
  joinedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Draw {
  id: string;
  raffleId: string;
  status: DrawStatus;
  presentationState: DrawPresentationState;
  initiatedBy: string;
  startedAt?: Timestamp | null;
  completedAt?: Timestamp | null;
  eligibleEntryCount: number;
  randomizationVersion: string;
  failureReason?: string | null;
  createdAt: Timestamp;
}

export interface Winner {
  id: string;
  raffleId: string;
  drawId: string;
  entryId: string;
  userId: string;
  entryNumber: string;
  /** Masked display name (e.g. "John D.") — the only participant-identifying
   * field ever exposed on public surfaces (completed raffle page, draw screen). */
  displayName: string;
  status: WinnerStatus;
  isActive: boolean; // false once superseded by a redraw
  disqualifiedBy?: string | null;
  disqualifiedAt?: Timestamp | null;
  disqualificationReason?: string | null;
  isRedraw: boolean;
  redrawOfWinnerId?: string | null;
  redrawReason?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  actorId: string;
  actorRole: UserRole | "system";
  raffleId?: string | null;
  targetId?: string | null;
  timestamp: Timestamp;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// UI-facing derived types
// ---------------------------------------------------------------------------

export type RaffleListSection = "present" | "upcoming" | "completed";
