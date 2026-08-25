"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import { logSnapshotError } from "@/lib/firebase/snapshot";
import { AppError } from "@/lib/errors";
import type { Payment, PaymentStatus, RaffleEntry, UserRole } from "@/types/firestore";
import type { ReviewPaymentInput } from "@/lib/validation/schemas";

const paymentConverter = converterFor<Payment>();
const paymentsCol = () => collection(db, "payments").withConverter(paymentConverter);

export async function getPayment(paymentId: string): Promise<Payment | null> {
  const snap = await getDoc(doc(db, "payments", paymentId).withConverter(paymentConverter));
  return snap.exists() ? snap.data() : null;
}

export function watchPayment(paymentId: string, cb: (payment: Payment | null) => void): () => void {
  return onSnapshot(
    doc(db, "payments", paymentId).withConverter(paymentConverter),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (error) => {
      logSnapshotError(`payments/${paymentId}`, error);
      cb(null);
    },
  );
}

export async function listMyPayments(userId: string): Promise<Payment[]> {
  const q = query(paymentsCol(), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export interface PaymentsPage {
  payments: Payment[];
  cursor: QueryDocumentSnapshot<Payment> | null;
}

export async function listPaymentsForQueue(
  opts: {
    raffleId?: string;
    status?: PaymentStatus | "all";
    pageSize?: number;
    cursor?: QueryDocumentSnapshot<Payment> | null;
  } = {},
): Promise<PaymentsPage> {
  const pageSize = opts.pageSize ?? 25;
  const clauses: QueryConstraint[] = [];
  if (opts.raffleId) clauses.push(where("raffleId", "==", opts.raffleId));
  if (opts.status && opts.status !== "all") clauses.push(where("status", "==", opts.status));
  const q = query(
    paymentsCol(),
    ...clauses,
    orderBy("createdAt", "desc"),
    fsLimit(pageSize),
    ...(opts.cursor ? [startAfter(opts.cursor)] : []),
  );
  const snap = await getDocs(q);
  return {
    payments: snap.docs.map((d) => d.data()),
    cursor: snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null,
  };
}

export interface ReviewPaymentResult {
  paymentId: string;
  status: "approved" | "rejected";
  entryNumber?: string;
}

/**
 * The only path by which a payment moves to "approved"/"rejected" — replaces
 * the removed reviewPayment Cloud Function. Idempotent: re-approving an
 * already-approved payment is a safe no-op, same as before.
 */
export async function reviewPayment(
  input: ReviewPaymentInput,
  actorId: string,
  actorRole: UserRole,
): Promise<ReviewPaymentResult> {
  const paymentRef = doc(db, "payments", input.paymentId);

  return runTransaction(db, async (tx) => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists()) throw new AppError("Payment not found.");
    const payment = paymentSnap.data() as Payment;

    const entryRef = doc(db, "entries", payment.entryId);
    const raffleRef = doc(db, "raffles", payment.raffleId);
    const [entrySnap, raffleSnap] = await Promise.all([tx.get(entryRef), tx.get(raffleRef)]);
    if (!entrySnap.exists()) throw new AppError("Entry not found.");
    if (!raffleSnap.exists()) throw new AppError("Raffle not found.");
    const entry = entrySnap.data() as RaffleEntry;

    if (input.decision === "approve" && payment.status === "approved") {
      return { paymentId: input.paymentId, status: "approved" as const, entryNumber: entry.entryNumber };
    }
    if (input.decision === "reject" && payment.status === "rejected") {
      return { paymentId: input.paymentId, status: "rejected" as const };
    }
    if (payment.status !== "pending") {
      throw new AppError("This payment is not awaiting verification.");
    }

    if (input.decision === "approve") {
      tx.update(paymentRef, {
        status: "approved",
        reviewedAt: serverTimestamp(),
        reviewedBy: actorId,
        updatedAt: serverTimestamp(),
      });
      tx.update(entryRef, {
        status: "eligible",
        isEligible: true,
        updatedAt: serverTimestamp(),
      });
      tx.update(raffleRef, {
        "stats.paymentsPending": increment(-1),
        "stats.paymentsApproved": increment(1),
        "stats.eligibleEntries": increment(1),
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(collection(db, "auditLogs")), {
        action: "PAYMENT_APPROVED",
        actorId,
        actorRole,
        raffleId: payment.raffleId,
        targetId: input.paymentId,
        timestamp: serverTimestamp(),
      });
      return { paymentId: input.paymentId, status: "approved" as const, entryNumber: entry.entryNumber };
    }

    tx.update(paymentRef, {
      status: "rejected",
      rejectionReason: input.rejectionReason,
      reviewedAt: serverTimestamp(),
      reviewedBy: actorId,
      updatedAt: serverTimestamp(),
    });
    tx.update(entryRef, {
      status: "rejected",
      updatedAt: serverTimestamp(),
    });
    tx.update(raffleRef, {
      "stats.paymentsPending": increment(-1),
      "stats.paymentsRejected": increment(1),
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(collection(db, "auditLogs")), {
      action: "PAYMENT_REJECTED",
      actorId,
      actorRole,
      raffleId: payment.raffleId,
      targetId: input.paymentId,
      timestamp: serverTimestamp(),
      metadata: { reason: input.rejectionReason },
    });
    return { paymentId: input.paymentId, status: "rejected" as const };
  });
}
