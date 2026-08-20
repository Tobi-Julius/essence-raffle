"use client";

import { collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import { logSnapshotError } from "@/lib/firebase/snapshot";
import type { Winner } from "@/types/firestore";

const winnerConverter = converterFor<Winner>();
const winnersCol = () => collection(db, "winners").withConverter(winnerConverter);

/** All winner records for a raffle, most recent first — includes superseded/disqualified history. */
export async function listWinnerHistory(raffleId: string): Promise<Winner[]> {
  const q = query(winnersCol(), where("raffleId", "==", raffleId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/** The single active (non-superseded) winner for a raffle, if any. */
export async function getActiveWinner(raffleId: string): Promise<Winner | null> {
  const q = query(
    winnersCol(),
    where("raffleId", "==", raffleId),
    where("isActive", "==", true),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].data();
}

export function watchActiveWinner(raffleId: string, cb: (winner: Winner | null) => void): () => void {
  const q = query(
    winnersCol(),
    where("raffleId", "==", raffleId),
    where("isActive", "==", true),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.empty ? null : snap.docs[0].data()),
    (error) => {
      logSnapshotError(`winners (raffleId=${raffleId})`, error);
      cb(null);
    },
  );
}

export async function listAllWinnersForAdmin(): Promise<Winner[]> {
  const q = query(winnersCol(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}
