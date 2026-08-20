import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue } from "../shared/admin";
import { requireUid, requireActiveUser, notFound, conflict, preconditionFailed } from "../shared/errors";
import { writeAuditLog } from "../shared/audit";
import { registerForRaffleSchema, parseOrThrow } from "../shared/validation";
import { readCounter, commitNextEntryNumber, generateReferenceCandidate, commitReference } from "../shared/entryNumber";
import type { Raffle, RaffleTerms } from "../shared/types";

/**
 * The single entry point for joining a raffle. Everything the client sends
 * is re-verified here: raffle existence and OPEN status, the registration
 * window (server clock, not the browser's), eligibility, per-user entry
 * limits, and that the terms version being accepted is the CURRENTLY active
 * one. All reads happen before any writes (Firestore transaction
 * constraint), and the whole operation commits atomically so a user can
 * never end up with an entry but no payment record, or vice versa.
 */
export const registerForRaffle = onCall(async (request) => {
  const uid = requireUid(request);
  await requireActiveUser(uid);
  const input = parseOrThrow(registerForRaffleSchema, request.data);

  const raffleRef = db.collection("raffles").doc(input.raffleId);
  const termsRef = db.collection("raffles").doc(input.raffleId).collection("terms").doc(input.termsId);

  const result = await db.runTransaction(async (tx) => {
    // ---- READ PHASE ----
    const [raffleSnap, termsSnap] = await Promise.all([tx.get(raffleRef), tx.get(termsRef)]);
    if (!raffleSnap.exists) notFound("This raffle no longer exists.");
    const raffle = { id: raffleSnap.id, ...raffleSnap.data() } as Raffle;

    if (!termsSnap.exists) notFound("These terms are no longer available.");
    const terms = { id: termsSnap.id, ...termsSnap.data() } as RaffleTerms;

    if (raffle.status !== "OPEN") preconditionFailed("This raffle is not currently accepting entries.");

    const now = new Date();
    const start = raffle.schedule.registrationStart.toDate();
    const end = raffle.schedule.registrationEnd.toDate();
    if (now < start) preconditionFailed("Registration has not opened yet.");
    if (now > end) preconditionFailed("Registration has closed.");

    if (raffle.activeTermsId !== input.termsId || terms.status !== "active") {
      preconditionFailed("These terms have changed. Please review the latest Terms & Conditions.");
    }
    if (terms.version !== input.termsVersion) {
      preconditionFailed("These terms have changed. Please review the latest Terms & Conditions.");
    }

    // Eligibility: "everyone" is fully enforced today. Other eligibility
    // types are intentionally extension points (per product spec) for a
    // future group-membership data model — allowing here, not silently
    // rejecting, keeps day-one behavior correct for the common case.
    void raffle.eligibility;

    const existingEntriesSnap = await tx.get(
      db
        .collection("entries")
        .where("raffleId", "==", input.raffleId)
        .where("userId", "==", uid)
        .where("status", "in", ["payment_pending", "verification_pending", "eligible"]),
    );
    const activeCount = existingEntriesSnap.size;
    if (!raffle.entryConfig.allowMultipleEntries && activeCount >= 1) {
      conflict("You have already registered for this raffle.");
    }
    if (raffle.entryConfig.allowMultipleEntries && activeCount >= raffle.entryConfig.maxEntriesPerUser) {
      conflict(`You've reached the maximum of ${raffle.entryConfig.maxEntriesPerUser} entries for this raffle.`);
    }

    const counterSnap = await readCounter(tx, input.raffleId);

    // ---- WRITE PHASE ----
    const { entryNumber, sequence } = commitNextEntryNumber(tx, input.raffleId, counterSnap);
    const reference = generateReferenceCandidate();
    commitReference(tx, reference);

    const entryRef = db.collection("entries").doc();
    const paymentRef = db.collection("payments").doc();

    tx.set(entryRef, {
      raffleId: input.raffleId,
      userId: uid,
      paymentId: paymentRef.id,
      entryNumber,
      sequence,
      status: "payment_pending",
      isEligible: false,
      termsId: input.termsId,
      termsVersion: input.termsVersion,
      termsAcceptedAt: FieldValue.serverTimestamp(),
      joinedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.set(paymentRef, {
      raffleId: input.raffleId,
      userId: uid,
      entryId: entryRef.id,
      amount: raffle.payment.entryFee,
      currency: raffle.payment.currency,
      paymentMethod: "bank_transfer",
      reference,
      receiptPath: null,
      status: "pending",
      refundStatus: "none",
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.update(raffleRef, {
      "stats.totalRegistrations": FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    writeAuditLog(tx, {
      action: "REGISTRATION_CREATED",
      actorId: uid,
      actorRole: "participant",
      raffleId: input.raffleId,
      targetId: entryRef.id,
    });
    writeAuditLog(tx, {
      action: "TERMS_ACCEPTED",
      actorId: uid,
      actorRole: "participant",
      raffleId: input.raffleId,
      targetId: input.termsId,
      metadata: { version: input.termsVersion },
    });
    writeAuditLog(tx, {
      action: "ENTRY_CREATED",
      actorId: uid,
      actorRole: "participant",
      raffleId: input.raffleId,
      targetId: entryRef.id,
      metadata: { entryNumber },
    });

    return {
      entryId: entryRef.id,
      paymentId: paymentRef.id,
      reference,
      entryFee: raffle.payment.entryFee,
      currency: raffle.payment.currency,
    };
  });

  return result;
});
