"use client";

import { collection, getDocs, limit as fsLimit, orderBy, query, startAfter, where, type QueryConstraint, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import type { AuditAction, AuditLog } from "@/types/firestore";

const auditConverter = converterFor<AuditLog>();
const auditCol = () => collection(db, "auditLogs").withConverter(auditConverter);

export interface AuditLogPage {
  logs: AuditLog[];
  cursor: QueryDocumentSnapshot<AuditLog> | null;
}

/**
 * Read-only. Audit logs are append-only and written exclusively by Cloud
 * Functions (see functions/src/shared/audit.ts) — there is no client write
 * path for this collection, enforced by Firestore rules.
 */
export async function listAuditLogs(
  opts: {
    raffleId?: string;
    action?: AuditAction;
    pageSize?: number;
    cursor?: QueryDocumentSnapshot<AuditLog> | null;
  } = {},
): Promise<AuditLogPage> {
  const pageSize = opts.pageSize ?? 50;
  const clauses: QueryConstraint[] = [];
  if (opts.raffleId) clauses.push(where("raffleId", "==", opts.raffleId));
  if (opts.action) clauses.push(where("action", "==", opts.action));
  const q = query(
    auditCol(),
    ...clauses,
    orderBy("timestamp", "desc"),
    fsLimit(pageSize),
    ...(opts.cursor ? [startAfter(opts.cursor)] : []),
  );
  const snap = await getDocs(q);
  return {
    logs: snap.docs.map((d) => d.data()),
    cursor: snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null,
  };
}
