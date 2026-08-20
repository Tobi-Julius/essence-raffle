import type { DocumentReference, DocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { db } from "./admin";

/**
 * Sequential, human-readable entry numbers (e.g. RFL-2026-000001) are backed
 * by a per-raffle counter document. Firestore transactions require every
 * read to happen before any write, so these helpers are split into a
 * `read*` step (call during the read phase) and a `commit*` step (call
 * during the write phase) rather than bundling get+set together.
 */
export function counterRef(raffleId: string): DocumentReference {
  return db.collection("counters").doc(raffleId);
}

export function readCounter(tx: Transaction, raffleId: string): Promise<DocumentSnapshot> {
  return tx.get(counterRef(raffleId));
}

export function commitNextEntryNumber(
  tx: Transaction,
  raffleId: string,
  counterSnap: DocumentSnapshot,
): { entryNumber: string; sequence: number } {
  const current = counterSnap.exists ? ((counterSnap.data()?.lastEntrySequence as number) ?? 0) : 0;
  const sequence = current + 1;
  tx.set(counterRef(raffleId), { lastEntrySequence: sequence }, { merge: true });
  const year = new Date().getFullYear();
  return { entryNumber: `RFL-${year}-${String(sequence).padStart(6, "0")}`, sequence };
}

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

export function generateReferenceCandidate(): string {
  const year = new Date().getFullYear();
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return `RFL-${year}-${suffix}`;
}

/**
 * Reserves a payment reference via `create()`, which fails atomically if the
 * document already exists. With a 33^6 (~1.29 billion) candidate space,
 * collisions are astronomically unlikely; on the rare failure the caller's
 * whole transaction aborts and the client simply retries registration.
 */
export function commitReference(tx: Transaction, reference: string): void {
  tx.create(db.collection("paymentReferences").doc(reference), { createdAt: new Date() });
}
