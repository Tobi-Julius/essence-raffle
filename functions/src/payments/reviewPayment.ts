import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue } from "../shared/admin";
import { requireUid, requireAdmin, notFound, preconditionFailed } from "../shared/errors";
import { writeAuditLog } from "../shared/audit";
import { reviewPaymentSchema, parseOrThrow } from "../shared/validation";
import type { Payment } from "../shared/types";

/**
 * The ONLY path by which a payment can move to "approved" or "rejected".
 * Approval is what activates a raffle entry's eligibility — nothing in
 * Firestore rules allows a client to set payment.status directly (see
 * firestore.rules). Idempotent: re-approving an already-approved payment
 * (e.g. a double click, or a retried request) is a safe no-op rather than a
 * duplicate side effect or an error.
 */
export const reviewPayment = onCall(async (request) => {
  const uid = requireUid(request);
  const admin = await requireAdmin(uid);
  const input = parseOrThrow(reviewPaymentSchema, request.data);

  const paymentRef = db.collection("payments").doc(input.paymentId);

  return db.runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) notFound("Payment not found.");
    const payment = { id: paymentSnap.id, ...paymentSnap.data() } as Payment;

    const entryRef = db.collection("entries").doc(payment.entryId);
    const raffleRef = db.collection("raffles").doc(payment.raffleId);
    const [entrySnap, raffleSnap] = await Promise.all([tx.get(entryRef), tx.get(raffleRef)]);
    if (!entrySnap.exists) notFound("Entry not found.");
    if (!raffleSnap.exists) notFound("Raffle not found.");

    // Idempotency: a repeat request matching the payment's current terminal
    // state is treated as success with no further side effects.
    if (input.decision === "approve" && payment.status === "approved") {
      return { paymentId: payment.id, status: "approved" as const, entryNumber: entrySnap.data()?.entryNumber as string };
    }
    if (input.decision === "reject" && payment.status === "rejected") {
      return { paymentId: payment.id, status: "rejected" as const };
    }

    if (payment.status !== "verification_pending") {
      preconditionFailed("This payment is not awaiting verification.");
    }

    if (input.decision === "approve") {
      tx.update(paymentRef, {
        status: "approved",
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(entryRef, {
        status: "eligible",
        isEligible: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(raffleRef, {
        "stats.paymentsPending": FieldValue.increment(-1),
        "stats.paymentsApproved": FieldValue.increment(1),
        "stats.eligibleEntries": FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeAuditLog(tx, {
        action: "PAYMENT_APPROVED",
        actorId: uid,
        actorRole: admin.role,
        raffleId: payment.raffleId,
        targetId: payment.id,
      });
      writeAuditLog(tx, {
        action: "ENTRY_APPROVED",
        actorId: uid,
        actorRole: admin.role,
        raffleId: payment.raffleId,
        targetId: payment.entryId,
      });
      return { paymentId: payment.id, status: "approved" as const, entryNumber: entrySnap.data()?.entryNumber as string };
    }

    // reject
    tx.update(paymentRef, {
      status: "rejected",
      rejectionReason: input.rejectionReason,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(entryRef, {
      status: "rejected",
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(raffleRef, {
      "stats.paymentsPending": FieldValue.increment(-1),
      "stats.paymentsRejected": FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeAuditLog(tx, {
      action: "PAYMENT_REJECTED",
      actorId: uid,
      actorRole: admin.role,
      raffleId: payment.raffleId,
      targetId: payment.id,
      metadata: { reason: input.rejectionReason },
    });
    return { paymentId: payment.id, status: "rejected" as const };
  });
});
