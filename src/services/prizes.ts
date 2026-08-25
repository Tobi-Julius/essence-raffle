"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import { logSnapshotError } from "@/lib/firebase/snapshot";
import { AppError } from "@/lib/errors";
import type { Prize, UserRole } from "@/types/firestore";
import type { PrizeInput } from "@/lib/validation/schemas";

const prizeConverter = converterFor<Prize>();
const prizeDocRef = (raffleId: string) => doc(db, "prizes", raffleId).withConverter(prizeConverter);

export async function getPrize(raffleId: string): Promise<Prize | null> {
  const snap = await getDoc(prizeDocRef(raffleId));
  return snap.exists() ? snap.data() : null;
}

export function watchPrize(raffleId: string, cb: (prize: Prize | null) => void): () => void {
  return onSnapshot(
    prizeDocRef(raffleId),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (error) => {
      logSnapshotError(`prizes/${raffleId}`, error);
      cb(null);
    },
  );
}

/** Upsert — a raffle has exactly one prize document, keyed by raffleId. */
export async function upsertPrize(raffleId: string, input: PrizeInput): Promise<void> {
  const existing = await getDoc(prizeDocRef(raffleId));
  if (existing.exists()) {
    await updateDoc(prizeDocRef(raffleId), {
      name: input.name,
      description: input.description,
      value: input.value ?? null,
      currency: input.currency ?? null,
      updatedAt: serverTimestamp(),
    });
    return;
  }
  await setDoc(prizeDocRef(raffleId), {
    raffleId,
    name: input.name,
    description: input.description,
    imageUrl: null,
    videoUrl: null,
    value: input.value ?? null,
    currency: input.currency ?? null,
    status: "available",
    claimedAt: null,
    claimedBy: null,
    verifiedBy: null,
    claimNotes: null,
    deliveryDate: null,
    deliveryMethod: null,
    proofOfDeliveryPath: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as Omit<Prize, "id">);
}

export async function updatePrizeMedia(
  raffleId: string,
  media: { imageUrl?: string; videoUrl?: string },
): Promise<void> {
  await updateDoc(prizeDocRef(raffleId), { ...media, updatedAt: serverTimestamp() });
}

/**
 * Marks the prize claimed and the active winner claimed — replaces the
 * removed claimPrize Cloud Function. Looks up the active winner by query
 * rather than trusting a client-passed id, same as the original.
 */
export async function claimPrize(
  raffleId: string,
  input: { claimNotes?: string; deliveryMethod?: string },
  actorId: string,
  actorRole: UserRole,
): Promise<void> {
  const activeWinnerSnap = await getDocs(
    query(
      collection(db, "winners"),
      where("raffleId", "==", raffleId),
      where("isActive", "==", true),
      orderBy("createdAt", "desc"),
      fsLimit(1),
    ),
  );
  if (activeWinnerSnap.empty) throw new AppError("No active winner to claim a prize for.");
  const winnerRef = activeWinnerSnap.docs[0].ref;

  await runTransaction(db, async (tx) => {
    const prizeSnap = await tx.get(prizeDocRef(raffleId));
    if (!prizeSnap.exists()) throw new AppError("Prize not found.");
    const prize = prizeSnap.data();
    if (prize.status === "claimed") throw new AppError("This prize has already been claimed.");

    tx.update(prizeDocRef(raffleId), {
      status: "claimed",
      claimedAt: serverTimestamp(),
      claimedBy: actorId,
      verifiedBy: actorId,
      claimNotes: input.claimNotes ?? null,
      deliveryMethod: input.deliveryMethod ?? null,
      updatedAt: serverTimestamp(),
    });
    tx.update(winnerRef, { status: "claimed", updatedAt: serverTimestamp() });
    tx.set(doc(collection(db, "auditLogs")), {
      action: "PRIZE_CLAIMED",
      actorId,
      actorRole,
      raffleId,
      targetId: winnerRef.id,
      timestamp: serverTimestamp(),
    });
  });
}
