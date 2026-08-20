import { randomInt } from "node:crypto";
import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue } from "../shared/admin";
import { requireUid, requireAdmin, notFound, preconditionFailed, conflict } from "../shared/errors";
import { writeAuditLog } from "../shared/audit";
import { startDrawSchema, parseOrThrow } from "../shared/validation";
import { maskName } from "../shared/names";
import type { Raffle, UserProfile } from "../shared/types";

const RANDOMIZATION_VERSION = "node-crypto-randomInt-v1";

/**
 * The entire secure draw: eligibility snapshot, winner selection, and
 * result recording happen inside ONE Firestore transaction. This is what
 * makes it safe against two admins clicking "start draw" at the same
 * instant — both transactions read the same raffle/draw-lock state, and
 * Firestore's optimistic concurrency control means only one can commit;
 * the loser retries, sees a draw already exists, and fails cleanly instead
 * of producing a second, conflicting winner.
 *
 * Randomness comes from Node's `crypto.randomInt`, a CSPRNG-backed,
 * rejection-sampled uniform integer generator — never `Math.random()`, and
 * never anything computed in the browser.
 */
export const startDraw = onCall(async (request) => {
  const uid = requireUid(request);
  const admin = await requireAdmin(uid);
  const input = parseOrThrow(startDrawSchema, request.data);

  const raffleRef = db.collection("raffles").doc(input.raffleId);

  return db.runTransaction(async (tx) => {
    // ---- READ PHASE ----
    const raffleSnap = await tx.get(raffleRef);
    if (!raffleSnap.exists) notFound("Raffle not found.");
    const raffle = { id: raffleSnap.id, ...raffleSnap.data() } as Raffle;

    if (raffle.status === "CANCELLED") preconditionFailed("This raffle was cancelled.");
    if (raffle.status === "COMPLETED") preconditionFailed("This raffle has already been drawn.");

    const now = new Date();
    const registrationEnd = raffle.schedule.registrationEnd.toDate();
    const drawAt = raffle.schedule.drawAt.toDate();
    if (now < registrationEnd) preconditionFailed("Registration is still open — close it before drawing.");
    if (now < drawAt && !input.forceEarly) {
      preconditionFailed("The scheduled draw time hasn't been reached yet.");
    }

    const existingDrawsSnap = await tx.get(
      db.collection("draws").where("raffleId", "==", input.raffleId).where("status", "in", ["pending", "running"]),
    );
    if (!existingDrawsSnap.empty) conflict("A draw is already in progress for this raffle.");

    const eligibleSnap = await tx.get(
      db.collection("entries").where("raffleId", "==", input.raffleId).where("status", "==", "eligible"),
    );
    if (eligibleSnap.empty) preconditionFailed("There are no eligible entries to draw from.");

    const eligibleDocs = eligibleSnap.docs;
    const winnerIndex = randomInt(0, eligibleDocs.length);
    const winningEntryDoc = eligibleDocs[winnerIndex]!;
    const winningEntry = winningEntryDoc.data();

    const winnerUserSnap = await tx.get(db.collection("users").doc(winningEntry.userId as string));
    const winnerProfile = winnerUserSnap.data() as UserProfile | undefined;
    const displayName = maskName(winnerProfile?.fullName ?? "Winner");

    // ---- WRITE PHASE ----
    const drawRef = db.collection("draws").doc();
    const winnerRef = db.collection("winners").doc();

    tx.set(drawRef, {
      raffleId: input.raffleId,
      status: "completed",
      presentationState: "READY",
      initiatedBy: uid,
      startedAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
      eligibleEntryCount: eligibleDocs.length,
      randomizationVersion: RANDOMIZATION_VERSION,
      failureReason: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(winnerRef, {
      raffleId: input.raffleId,
      drawId: drawRef.id,
      entryId: winningEntryDoc.id,
      userId: winningEntry.userId,
      entryNumber: winningEntry.entryNumber,
      displayName,
      status: "pending_verification",
      isActive: true,
      disqualifiedBy: null,
      disqualifiedAt: null,
      disqualificationReason: null,
      isRedraw: false,
      redrawOfWinnerId: null,
      redrawReason: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.update(winningEntryDoc.ref, { status: "winner", updatedAt: FieldValue.serverTimestamp() });
    tx.update(raffleRef, {
      status: "COMPLETED",
      hasWinner: true,
      currentWinnerEntryId: winningEntryDoc.id,
      // The winning entry leaves the "still eligible for a future draw" pool.
      "stats.eligibleEntries": FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    writeAuditLog(tx, {
      action: "DRAW_STARTED",
      actorId: uid,
      actorRole: admin.role,
      raffleId: input.raffleId,
      targetId: drawRef.id,
      metadata: { eligibleEntryCount: eligibleDocs.length, randomizationVersion: RANDOMIZATION_VERSION },
    });
    writeAuditLog(tx, {
      action: "WINNER_SELECTED",
      actorId: uid,
      actorRole: admin.role,
      raffleId: input.raffleId,
      targetId: winnerRef.id,
      metadata: { entryNumber: winningEntry.entryNumber },
    });

    return { drawId: drawRef.id, status: "completed" };
  });
});
