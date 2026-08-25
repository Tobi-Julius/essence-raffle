"use client";

import { useEffect } from "react";
import { collection, getDocs, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { computeLifecycleStatus } from "@/lib/utils/raffleLifecycle";

/**
 * There is no Cloud Scheduler equivalent on Firebase's free Spark plan, so
 * raffle lifecycle sweeps (UPCOMING -> OPEN, OPEN -> DRAWING) that used to
 * run every 5 minutes via transitionRaffleStatuses now run opportunistically
 * whenever an admin has any /admin page open. This means a raffle's status
 * can lag by however long until an admin next loads the dashboard — it
 * self-heals on the very next admin page load, which is an accepted
 * tradeoff for a low-traffic app rather than a bug.
 */
export function useRaffleStatusSweep(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      const now = new Date();
      const [upcomingSnap, openSnap] = await Promise.all([
        getDocs(query(collection(db, "raffles"), where("status", "==", "UPCOMING"))),
        getDocs(query(collection(db, "raffles"), where("status", "==", "OPEN"))),
      ]);
      if (cancelled) return;

      const batch = writeBatch(db);
      let hasWrites = false;

      for (const d of upcomingSnap.docs) {
        if (computeLifecycleStatus(d.data().schedule, now) === "OPEN") {
          batch.update(d.ref, { status: "OPEN", updatedAt: serverTimestamp() });
          hasWrites = true;
        }
      }
      for (const d of openSnap.docs) {
        if (computeLifecycleStatus(d.data().schedule, now) === "READY_FOR_DRAW") {
          batch.update(d.ref, { status: "DRAWING", updatedAt: serverTimestamp() });
          hasWrites = true;
        }
      }

      if (hasWrites) await batch.commit();
    })().catch((error) => {
      // Best-effort — the UI doesn't depend on this succeeding immediately,
      // and it retries on the next admin page load regardless.
      console.error("[essence-raffle] raffle status sweep failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
