"use client";

import {
  collection,
  doc,
  getDocs,
  increment,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import { logSnapshotError } from "@/lib/firebase/snapshot";
import { AppError } from "@/lib/errors";
import { secureRandomInt } from "@/lib/utils/random";
import { maskDisplayName } from "@/lib/utils/names";
import { listEligibleEntries } from "@/services/entries";
import { getUserProfile } from "@/services/users";
import type { Draw, DrawPresentationState, UserRole } from "@/types/firestore";

const drawConverter = converterFor<Draw>();
const drawsCol = () => collection(db, "draws").withConverter(drawConverter);

/**
 * Realtime subscription used by both the admin draw console and the public
 * `/draw/[raffleId]` screen. Both surfaces react to the SAME Firestore
 * document, written by whichever admin's browser ran the draw.
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

export interface RunDrawResult {
  drawId: string;
  status: "completed";
}

/**
 * Selects a winner and records the draw — replaces the removed startDraw
 * Cloud Function. IMPORTANT CAVEAT: the old function used a server-side
 * CSPRNG inside one atomic transaction so the outcome couldn't be
 * influenced by anyone, including the admin running it. This version runs
 * entirely in the admin's browser (Web Crypto rejection-sampled selection,
 * see src/lib/utils/random.ts) — nothing server-side can verify the pick
 * was actually unbiased, only that a rules-enforced admin account made the
 * write. See the migration plan's Context section for the accepted
 * tradeoff. The eligible-entries pool is also read outside the transaction
 * (the Firestore Web SDK's transactions can only read individual documents,
 * not queries) — the transaction re-checks the raffle and the specific
 * winning entry are still in the expected state before committing, but
 * can't re-validate the whole pool atomically.
 */
export async function runDraw(raffleId: string, actorId: string, actorRole: UserRole): Promise<RunDrawResult> {
  const eligible = await listEligibleEntries(raffleId);
  if (eligible.length === 0) throw new AppError("No eligible entries to draw from.");
  const winnerEntry = eligible[secureRandomInt(eligible.length)];
  const winnerProfile = await getUserProfile(winnerEntry.userId);
  const displayName = maskDisplayName(winnerProfile?.fullName ?? "Participant");

  const raffleRef = doc(db, "raffles", raffleId);
  const entryRef = doc(db, "entries", winnerEntry.id);
  const drawRef = doc(collection(db, "draws"));
  const winnerRef = doc(collection(db, "winners"));

  await runTransaction(db, async (tx) => {
    const [raffleSnap, entrySnap] = await Promise.all([tx.get(raffleRef), tx.get(entryRef)]);
    if (!raffleSnap.exists()) throw new AppError("Raffle not found.");
    const raffle = raffleSnap.data();
    if (raffle.status !== "DRAWING") throw new AppError("This raffle is not ready for a draw.");
    if (raffle.hasWinner) throw new AppError("A winner has already been selected for this raffle.");
    if (!entrySnap.exists() || entrySnap.data().status !== "eligible") {
      throw new AppError("The selected entry is no longer eligible — please try again.");
    }

    tx.set(drawRef, {
      raffleId,
      status: "completed",
      presentationState: "READY",
      initiatedBy: actorId,
      startedAt: serverTimestamp(),
      completedAt: serverTimestamp(),
      eligibleEntryCount: eligible.length,
      randomizationVersion: "client-webcrypto-v1",
      createdAt: serverTimestamp(),
    });
    tx.set(winnerRef, {
      raffleId,
      drawId: drawRef.id,
      entryId: winnerEntry.id,
      userId: winnerEntry.userId,
      entryNumber: winnerEntry.entryNumber,
      displayName,
      status: "pending_verification",
      isActive: true,
      isRedraw: false,
      redrawOfWinnerId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(entryRef, { status: "winner", updatedAt: serverTimestamp() });
    tx.update(raffleRef, {
      status: "COMPLETED",
      hasWinner: true,
      currentWinnerEntryId: winnerEntry.id,
      "stats.eligibleEntries": increment(-1),
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(collection(db, "auditLogs")), {
      action: "DRAW_STARTED",
      actorId,
      actorRole,
      raffleId,
      targetId: drawRef.id,
      timestamp: serverTimestamp(),
    });
  });

  return { drawId: drawRef.id, status: "completed" };
}

/** Replaces the removed updateDrawPresentation Cloud Function. */
export async function advanceDrawPresentation(drawId: string, presentationState: DrawPresentationState): Promise<void> {
  await updateDoc(doc(db, "draws", drawId), { presentationState, updatedAt: serverTimestamp() });
}
