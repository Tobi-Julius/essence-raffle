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
import type { UserRole, Winner } from "@/types/firestore";

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

/**
 * Marks a winner disqualified and reopens the raffle's winner slot for a
 * redraw — replaces the removed disqualifyWinner Cloud Function.
 */
export async function disqualifyWinner(
  winnerId: string,
  reason: string,
  actorId: string,
  actorRole: UserRole,
): Promise<{ winnerId: string; status: "disqualified" }> {
  const winnerRef = doc(db, "winners", winnerId);

  await runTransaction(db, async (tx) => {
    const winnerSnap = await tx.get(winnerRef);
    if (!winnerSnap.exists()) throw new AppError("Winner record not found.");
    const winner = winnerSnap.data() as Winner;
    if (winner.status === "disqualified") throw new AppError("This winner has already been disqualified.");

    const entryRef = doc(db, "entries", winner.entryId);
    const raffleRef = doc(db, "raffles", winner.raffleId);
    const [entrySnap, raffleSnap] = await Promise.all([tx.get(entryRef), tx.get(raffleRef)]);
    if (!entrySnap.exists()) throw new AppError("Entry not found.");
    if (!raffleSnap.exists()) throw new AppError("Raffle not found.");

    tx.update(winnerRef, {
      status: "disqualified",
      isActive: false,
      disqualifiedBy: actorId,
      disqualifiedAt: serverTimestamp(),
      disqualificationReason: reason,
      updatedAt: serverTimestamp(),
    });
    tx.update(entryRef, { status: "disqualified", isEligible: false, updatedAt: serverTimestamp() });
    tx.update(raffleRef, {
      hasWinner: false,
      currentWinnerEntryId: null,
      "stats.disqualifiedEntries": increment(1),
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(collection(db, "auditLogs")), {
      action: "WINNER_DISQUALIFIED",
      actorId,
      actorRole,
      raffleId: winner.raffleId,
      targetId: winnerId,
      timestamp: serverTimestamp(),
      metadata: { reason },
    });
  });

  return { winnerId, status: "disqualified" };
}

export interface RedrawResult {
  winnerId: string | null;
  status: "completed" | "no_eligible_entries";
}

/**
 * Selects a replacement winner after a disqualification, from whatever
 * entries are still `eligible` (previously-selected/disqualified entries
 * are excluded automatically since their status has moved on). Same
 * fairness caveat as runDraw (src/services/draws.ts) applies here.
 */
export async function redraw(raffleId: string, actorId: string, actorRole: UserRole): Promise<RedrawResult> {
  const eligible = await listEligibleEntries(raffleId);
  if (eligible.length === 0) return { winnerId: null, status: "no_eligible_entries" };

  const winnerEntry = eligible[secureRandomInt(eligible.length)];
  const winnerProfile = await getUserProfile(winnerEntry.userId);
  const displayName = maskDisplayName(winnerProfile?.fullName ?? "Participant");

  const [disqualifiedSnap, latestDrawSnap] = await Promise.all([
    getDocs(
      query(
        winnersCol(),
        where("raffleId", "==", raffleId),
        where("status", "==", "disqualified"),
        orderBy("disqualifiedAt", "desc"),
      ),
    ),
    getDocs(query(collection(db, "draws"), where("raffleId", "==", raffleId), orderBy("createdAt", "desc"), fsLimit(1))),
  ]);
  const redrawOfWinnerId = disqualifiedSnap.empty ? null : disqualifiedSnap.docs[0].id;
  const drawId = latestDrawSnap.empty ? null : latestDrawSnap.docs[0].id;

  const raffleRef = doc(db, "raffles", raffleId);
  const entryRef = doc(db, "entries", winnerEntry.id);
  const winnerRef = doc(collection(db, "winners"));

  await runTransaction(db, async (tx) => {
    const [raffleSnap, entrySnap] = await Promise.all([tx.get(raffleRef), tx.get(entryRef)]);
    if (!raffleSnap.exists()) throw new AppError("Raffle not found.");
    const raffle = raffleSnap.data();
    if (raffle.hasWinner) throw new AppError("A winner has already been selected for this raffle.");
    if (!entrySnap.exists() || entrySnap.data().status !== "eligible") {
      throw new AppError("The selected entry is no longer eligible — please try again.");
    }

    tx.set(winnerRef, {
      raffleId,
      drawId,
      entryId: winnerEntry.id,
      userId: winnerEntry.userId,
      entryNumber: winnerEntry.entryNumber,
      displayName,
      status: "pending_verification",
      isActive: true,
      isRedraw: true,
      redrawOfWinnerId,
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
      action: "REDRAW_STARTED",
      actorId,
      actorRole,
      raffleId,
      targetId: winnerRef.id,
      timestamp: serverTimestamp(),
    });
  });

  return { winnerId: winnerRef.id, status: "completed" };
}
