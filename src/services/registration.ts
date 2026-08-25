"use client";

import { collection, doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { AppError } from "@/lib/errors";
import type { RegisterForRaffleInput } from "@/lib/validation/schemas";

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function randomReference(): string {
  const year = new Date().getFullYear();
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return `RFL-${year}-${suffix}`;
}

class ReferenceCollisionError extends Error {}

export interface RegisterForRaffleResult {
  entryId: string;
  paymentId: string;
  reference: string;
  entryFee: number;
  currency: string;
}

/**
 * The single entry point for joining a raffle, replacing the old
 * registerForRaffle Cloud Function (removed — this project stays on
 * Firebase's free Spark plan, which can't run Cloud Functions at all).
 * Everything here is re-validated client-side for UX; the actual security
 * boundary is firestore.rules (see the /raffles, /entries, /payments,
 * /counters, /paymentReferences rules). Unlike the old Admin SDK version,
 * per-user entry-limit enforcement is NOT airtight here — see the plan notes
 * on that accepted tradeoff.
 */
export async function registerForRaffle(
  input: RegisterForRaffleInput,
  userId: string,
): Promise<RegisterForRaffleResult> {
  const raffleRef = doc(db, "raffles", input.raffleId);
  const termsRef = doc(db, "raffles", input.raffleId, "terms", input.termsId);
  const counterRef = doc(db, "counters", input.raffleId);

  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = randomReference();
    const referenceRef = doc(db, "paymentReferences", reference);
    const entryRef = doc(collection(db, "entries"));
    const paymentRef = doc(collection(db, "payments"));

    try {
      return await runTransaction(db, async (tx) => {
        const [raffleSnap, termsSnap, counterSnap, referenceSnap] = await Promise.all([
          tx.get(raffleRef),
          tx.get(termsRef),
          tx.get(counterRef),
          tx.get(referenceRef),
        ]);

        if (referenceSnap.exists()) throw new ReferenceCollisionError();
        if (!raffleSnap.exists()) throw new AppError("This raffle no longer exists.");
        const raffle = raffleSnap.data();
        if (!termsSnap.exists()) throw new AppError("These terms are no longer available.");
        const terms = termsSnap.data();

        if (raffle.status !== "OPEN") throw new AppError("This raffle is not currently accepting entries.");
        const now = new Date();
        if (now < raffle.schedule.registrationStart.toDate()) throw new AppError("Registration has not opened yet.");
        if (now > raffle.schedule.registrationEnd.toDate()) throw new AppError("Registration has closed.");
        if (raffle.activeTermsId !== input.termsId || terms.status !== "active") {
          throw new AppError("These terms have changed. Please review the latest Terms & Conditions.");
        }
        if (terms.version !== input.termsVersion) {
          throw new AppError("These terms have changed. Please review the latest Terms & Conditions.");
        }

        const sequence = (counterSnap.exists() ? (counterSnap.data().lastEntrySequence as number) : 0) + 1;
        const year = new Date().getFullYear();
        const entryNumber = `RFL-${year}-${String(sequence).padStart(6, "0")}`;

        tx.set(referenceRef, { createdAt: serverTimestamp() });
        tx.set(counterRef, { lastEntrySequence: sequence }, { merge: true });

        tx.set(entryRef, {
          raffleId: input.raffleId,
          userId,
          paymentId: paymentRef.id,
          entryNumber,
          sequence,
          status: "payment_pending",
          isEligible: false,
          termsId: input.termsId,
          termsVersion: input.termsVersion,
          termsAcceptedAt: serverTimestamp(),
          joinedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        tx.set(paymentRef, {
          raffleId: input.raffleId,
          userId,
          entryId: entryRef.id,
          amount: raffle.payment.entryFee,
          currency: raffle.payment.currency,
          paymentMethod: "bank_transfer",
          reference,
          status: "pending",
          refundStatus: "none",
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        tx.update(raffleRef, {
          "stats.totalRegistrations": increment(1),
          "stats.paymentsPending": increment(1),
          updatedAt: serverTimestamp(),
        });

        tx.set(doc(collection(db, "auditLogs")), {
          action: "REGISTRATION_CREATED",
          actorId: userId,
          actorRole: "participant",
          raffleId: input.raffleId,
          targetId: entryRef.id,
          timestamp: serverTimestamp(),
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
    } catch (e) {
      if (e instanceof ReferenceCollisionError) continue;
      throw e;
    }
  }
  throw new AppError("Could not generate a unique payment reference. Please try again.");
}
