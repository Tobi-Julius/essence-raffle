/**
 * Mirrors src/types/firestore.ts on the client. Kept as a separate copy
 * because the Cloud Functions package is deployed independently and does
 * not share a TypeScript project with the Next.js app. Keep these two files
 * in sync when the schema changes.
 */
import type { Timestamp } from "firebase-admin/firestore";

export type UserRole = "participant" | "admin" | "super_admin";

export type RaffleStatus = "DRAFT" | "UPCOMING" | "OPEN" | "DRAWING" | "COMPLETED" | "CANCELLED";

export type EligibilityType = "everyone" | "employees_only" | "customers_only" | "specific_group";

export type PaymentStatus = "pending" | "verification_pending" | "approved" | "rejected";

export type EntryStatus =
  | "payment_pending"
  | "verification_pending"
  | "eligible"
  | "rejected"
  | "cancelled"
  | "disqualified"
  | "winner";

export type DrawStatus = "pending" | "running" | "completed" | "failed";

export type DrawPresentationState = "READY" | "DRAWING" | "REVEALING" | "WINNER_REVEALED" | "COMPLETED";

export type WinnerStatus = "pending_verification" | "verified" | "disqualified" | "prize_assigned" | "claimed";

export type PrizeStatus = "available" | "assigned" | "claimed";

export type TermsStatus = "draft" | "active" | "archived";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RaffleSchedule {
  timezone: string;
  registrationStart: Timestamp;
  registrationEnd: Timestamp;
  drawAt: Timestamp;
}

export interface RafflePayment {
  entryFee: number;
  currency: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
}

export interface RaffleEligibility {
  type: EligibilityType;
  groupLabel?: string;
  description: string;
}

export interface RaffleEntryConfig {
  allowMultipleEntries: boolean;
  maxEntriesPerUser: number;
}

export interface RaffleStats {
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
  status: RaffleStatus;
  schedule: RaffleSchedule;
  payment: RafflePayment;
  eligibility: RaffleEligibility;
  entryConfig: RaffleEntryConfig;
  activeTermsId: string | null;
  activeTermsVersion: number | null;
  hasWinner: boolean;
  currentWinnerEntryId: string | null;
  stats: RaffleStats;
  createdBy: string;
}

export interface Prize {
  id: string;
  raffleId: string;
  name: string;
  status: PrizeStatus;
  value: number | null;
  currency: string | null;
}

export interface RaffleTerms {
  id: string;
  raffleId: string;
  version: number;
  status: TermsStatus;
}

export interface Payment {
  id: string;
  raffleId: string;
  userId: string;
  entryId: string;
  amount: number;
  currency: string;
  reference: string;
  receiptPath: string | null;
  status: PaymentStatus;
  rejectionReason: string | null;
}

export interface RaffleEntry {
  id: string;
  raffleId: string;
  userId: string;
  paymentId: string;
  entryNumber: string;
  sequence: number;
  status: EntryStatus;
  isEligible: boolean;
  termsId: string;
  termsVersion: number;
}

export interface Draw {
  id: string;
  raffleId: string;
  status: DrawStatus;
  presentationState: DrawPresentationState;
  eligibleEntryCount: number;
  randomizationVersion: string;
}

export interface Winner {
  id: string;
  raffleId: string;
  drawId: string;
  entryId: string;
  userId: string;
  entryNumber: string;
  displayName: string;
  status: WinnerStatus;
  isActive: boolean;
  isRedraw: boolean;
  redrawOfWinnerId: string | null;
}
