"use client";

import { collection, doc, getDocs, limit as fsLimit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import { logSnapshotError } from "@/lib/firebase/snapshot";
import type { Draw } from "@/types/firestore";

const drawConverter = converterFor<Draw>();
const drawsCol = () => collection(db, "draws").withConverter(drawConverter);

/**
 * Realtime subscription used by both the admin draw console and the public
 * `/draw/[raffleId]` screen. Both surfaces react to the SAME Firestore
 * document — the backend (Cloud Function) is the only writer.
 */
export function watchLatestDraw(raffleId: string, cb: (draw: Draw | null) => void): () => void {
  const q = query(drawsCol(), where("raffleId", "==", raffleId), orderBy("createdAt", "desc"), fsLimit(1));
  return onSnapshot(
    q,
    (snap) => cb(snap.empty ? null : snap.docs[0].data()),
    (error) => {
      logSnapshotError(`draws (raffleId=${raffleId})`, error);
      cb(null);
    },
  );
}

export async function listDrawsForRaffle(raffleId: string): Promise<Draw[]> {
  const q = query(drawsCol(), where("raffleId", "==", raffleId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export function watchDraw(drawId: string, cb: (draw: Draw | null) => void): () => void {
  return onSnapshot(
    doc(db, "draws", drawId).withConverter(drawConverter),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (error) => {
      logSnapshotError(`draws/${drawId}`, error);
      cb(null);
    },
  );
}
