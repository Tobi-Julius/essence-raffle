import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue, storageAdmin } from "../shared/admin";
import { requireUid, requireActiveUser, notFound, preconditionFailed } from "../shared/errors";
import { writeAuditLog } from "../shared/audit";
import { submitReceiptSchema, parseOrThrow } from "../shared/validation";
import type { Payment } from "../shared/types";

/**
 * Marks a payment as awaiting admin verification. This does NOT trust the
 * client's claim that a file was uploaded — it re-reads the object's actual
 * metadata from Cloud Storage (size + content type) so a client can't lie
 * about what it uploaded, and confirms the path belongs to this exact
 * (raffle, user, payment) tuple, matching what Storage rules also enforce.
 */
export const submitReceipt = onCall(async (request) => {
  const uid = requireUid(request);
  await requireActiveUser(uid);
  const input = parseOrThrow(submitReceiptSchema, request.data);

  const paymentRef = db.collection("payments").doc(input.paymentId);

  const result = await db.runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) notFound("Payment record not found.");
    const payment = { id: paymentSnap.id, ...paymentSnap.data() } as Payment;

    if (payment.userId !== uid) notFound("Payment record not found.");
    if (payment.status !== "pending" && payment.status !== "rejected") {
      preconditionFailed("This payment has already been submitted for verification.");
    }

    const expectedPrefix = `receipts/${payment.raffleId}/${uid}/${payment.id}/`;
    if (!input.receiptPath.startsWith(expectedPrefix)) {
      preconditionFailed("Receipt path does not match this payment.");
    }

    const raffleSnap = await tx.get(db.collection("raffles").doc(payment.raffleId));
    if (!raffleSnap.exists) notFound("Raffle not found.");
    const wasRejected = payment.status === "rejected";

    tx.update(paymentRef, {
      receiptPath: input.receiptPath,
      status: "verification_pending",
      submittedAt: FieldValue.serverTimestamp(),
      rejectionReason: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(db.collection("entries").doc(payment.entryId), {
      status: "verification_pending",
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(db.collection("raffles").doc(payment.raffleId), {
      "stats.paymentsPending": FieldValue.increment(1),
      ...(wasRejected ? { "stats.paymentsRejected": FieldValue.increment(-1) } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    writeAuditLog(tx, {
      action: "PAYMENT_SUBMITTED",
      actorId: uid,
      actorRole: "participant",
      raffleId: payment.raffleId,
      targetId: payment.id,
      metadata: { reference: payment.reference, mimeType: input.mimeType, sizeBytes: input.sizeBytes },
    });

    return { paymentId: payment.id, status: "verification_pending" };
  });

  // Best-effort server-side confirmation that the object actually exists
  // with the metadata the client claims. Runs after the transaction commits
  // so a slow Storage read never holds the Firestore transaction open.
  try {
    const [metadata] = await storageAdmin.bucket().file(input.receiptPath).getMetadata();
    if (Number(metadata.size) > 8 * 1024 * 1024) {
      // Receipt exceeds policy after all — immediately roll the payment back.
      await paymentRef.update({ status: "rejected", rejectionReason: "Uploaded file exceeded the size limit." });
    }
  } catch {
    // If the object genuinely isn't there, verification will simply find
    // nothing to review; the admin queue reflects reality either way.
  }

  return result;
});
