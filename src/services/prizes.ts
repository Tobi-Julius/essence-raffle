"use client";

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import { logSnapshotError } from "@/lib/firebase/snapshot";
import type { Prize } from "@/types/firestore";
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
    imagePath: null,
    imageUrl: null,
    videoPath: null,
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
  media: { imagePath?: string; imageUrl?: string; videoPath?: string; videoUrl?: string },
): Promise<void> {
  await updateDoc(prizeDocRef(raffleId), { ...media, updatedAt: serverTimestamp() });
}
