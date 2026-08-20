import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, FieldValue } from "../shared/admin";
import { writeAuditLogDirect } from "../shared/audit";
import { computeLifecycleStatus } from "../shared/schedule";
import type { Raffle } from "../shared/types";

/**
 * The backend is authoritative for raffle timing (never the browser clock —
 * see spec §45/§69). This sweeps UPCOMING raffles into OPEN once
 * registration starts, and OPEN raffles into DRAWING once registration
 * ends, purely from server time. It never touches DRAFT, DRAWING (already
 * there), COMPLETED, or CANCELLED raffles, and it never selects a winner —
 * that stays exclusively inside `startDraw`.
 */
export const transitionRaffleStatuses = onSchedule("every 5 minutes", async () => {
  const now = new Date();

  const [upcomingSnap, openSnap] = await Promise.all([
    db.collection("raffles").where("status", "==", "UPCOMING").get(),
    db.collection("raffles").where("status", "==", "OPEN").get(),
  ]);

  const batch = db.batch();
  let writes = 0;

  for (const doc of upcomingSnap.docs) {
    const raffle = doc.data() as Raffle;
    const lifecycle = computeLifecycleStatus(raffle.schedule, now);
    if (lifecycle === "OPEN") {
      batch.update(doc.ref, { status: "OPEN", updatedAt: FieldValue.serverTimestamp() });
      writes++;
    }
  }

  for (const doc of openSnap.docs) {
    const raffle = doc.data() as Raffle;
    const lifecycle = computeLifecycleStatus(raffle.schedule, now);
    if (lifecycle === "READY_FOR_DRAW") {
      batch.update(doc.ref, { status: "DRAWING", updatedAt: FieldValue.serverTimestamp() });
      writes++;
    }
  }

  if (writes > 0) {
    await batch.commit();
    await writeAuditLogDirect({
      action: "RAFFLE_UPDATED",
      actorId: "system",
      actorRole: "system",
      metadata: { reason: "scheduled_status_transition", count: writes },
    });
  }
});
