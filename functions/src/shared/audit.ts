import type { Transaction } from "firebase-admin/firestore";
import { db, FieldValue } from "./admin";
import type { UserRole } from "./types";

export type AuditAction =
  | "RAFFLE_CREATED"
  | "RAFFLE_UPDATED"
  | "RAFFLE_PUBLISHED"
  | "RAFFLE_CANCELLED"
  | "TERMS_CREATED"
  | "TERMS_UPDATED"
  | "TERMS_PUBLISHED"
  | "TERMS_ACCEPTED"
  | "PRIZE_CREATED"
  | "PRIZE_UPDATED"
  | "REGISTRATION_CREATED"
  | "PAYMENT_SUBMITTED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "ENTRY_CREATED"
  | "ENTRY_APPROVED"
  | "ENTRY_DISQUALIFIED"
  | "DRAW_STARTED"
  | "DRAW_PRESENTATION_UPDATED"
  | "WINNER_SELECTED"
  | "WINNER_VERIFIED"
  | "WINNER_DISQUALIFIED"
  | "REDRAW_STARTED"
  | "PRIZE_ASSIGNED"
  | "PRIZE_CLAIMED"
  | "ADMIN_ROLE_CHANGED"
  | "USER_DEACTIVATED"
  | "USER_REACTIVATED";

interface AuditInput {
  action: AuditAction;
  actorId: string;
  actorRole: UserRole | "system";
  raffleId?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Audit logs are append-only: this is the ONLY place `auditLogs` documents
 * are written, and Firestore rules deny all client writes to that
 * collection. Always pass the transaction when called from inside one so
 * the log write is part of the same atomic commit as the operation it
 * records.
 */
export function writeAuditLog(tx: Transaction, input: AuditInput): void {
  const ref = db.collection("auditLogs").doc();
  tx.set(ref, {
    action: input.action,
    actorId: input.actorId,
    actorRole: input.actorRole,
    raffleId: input.raffleId ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {},
    timestamp: FieldValue.serverTimestamp(),
  });
}

export async function writeAuditLogDirect(input: AuditInput): Promise<void> {
  await db.collection("auditLogs").add({
    action: input.action,
    actorId: input.actorId,
    actorRole: input.actorRole,
    raffleId: input.raffleId ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {},
    timestamp: FieldValue.serverTimestamp(),
  });
}
