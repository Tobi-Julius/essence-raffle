import { randomInt } from "node:crypto";
import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue } from "../shared/admin";
import { requireUid, requireAdmin, notFound, preconditionFailed } from "../shared/errors";
import { writeAuditLog } from "../shared/audit";
import { raffleIdSchema, parseOrThrow } from "../shared/validation";
import { maskName } from "../shared/names";
import type { Raffle, UserProfile } from "../shared/types";

const RANDOMIZATION_VERSION = "node-crypto-randomInt-v1";

/**
 * Selects a replacement winner after a disqualification. The eligible-pool
 * query only ever matches entries still in status "eligible" — a previous
 * winner (now "winner" or "disqualified") is automatically excluded, so a
 * disqualified participant can never be redrawn back in. If nobody eligible
 * remains, this returns winnerId: null rather than throwing, so the admin
 * UI can show that clearly instead of a generic error.
 */
export const redraw = onCall(async (request) => {
  const uid = requireUid(request);
  const admin = await requireAdmin(uid);
  const input = parseOrThrow(raffleIdSchema, request.data);

  const raffleRef = db.collection("raffles").doc(input.raffleId);

  return db.runTransaction(async (tx) => {
    const raffleSnap = await tx.get(raffleRef);
    if (!raffleSnap.exists) notFound("Raffle not found.");
    const raffle = { id: raffleSnap.id, ...raffleSnap.data() } as Raffle;

    if (raffle.hasWinner) preconditionFailed("This raffle already has an active winner.");

    const [latestDrawSnap, disqualifiedSnap, eligibleSnap] = await Promise.all([
      tx.get(db.collection("draws").where("raffleId", "==", input.raffleId).orderBy("createdAt", "desc").limit(1)),
      tx.get(
        db
          .collection("winners")
          .where("raffleId", "==", input.raffleId)
          .where("status", "==", "disqualified")
          .orderBy("disqualifiedAt", "desc")
          .limit(1),
      ),
      tx.get(db.collection("entries").where("raffleId", "==", input.raffleId).where("status", "==", "eligible")),
    ]);

    if (latestDrawSnap.empty) preconditionFailed("This raffle has not been drawn yet.");
    const drawId = latestDrawSnap.docs[0]!.id;
    const disqualifiedWinnerId = disqualifiedSnap.empty ? null : disqualifiedSnap.docs[0]!.id;

    if (eligibleSnap.empty) {
      return { winnerId: null, status: "no_eligible_entries" as const };
    }

    const eligibleDocs = eligibleSnap.docs;
    const winnerIndex = randomInt(0, eligibleDocs.length);
    const winningEntryDoc = eligibleDocs[winnerIndex]!;
    const winningEntry = winningEntryDoc.data();

    const winnerUserSnap = await tx.get(db.collection("users").doc(winningEntry.userId as string));
    const winnerProfile = winnerUserSnap.data() as UserProfile | undefined;
    const displayName = maskName(winnerProfile?.fullName ?? "Winner");

    const winnerRef = db.collection("winners").doc();
    tx.set(winnerRef, {
      raffleId: input.raffleId,
      drawId,
      entryId: winningEntryDoc.id,
      userId: winningEntry.userId,
      entryNumber: winningEntry.entryNumber,
      displayName,
      status: "pending_verification",
      isActive: true,
      disqualifiedBy: null,
      disqualifiedAt: null,
      disqualificationReason: null,
      isRedraw: true,
      redrawOfWinnerId: disqualifiedWinnerId,
      redrawReason: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.update(winningEntryDoc.ref, { status: "winner", updatedAt: FieldValue.serverTimestamp() });
    tx.update(raffleRef, {
      hasWinner: true,
      currentWinnerEntryId: winningEntryDoc.id,
      status: "COMPLETED",
      "stats.eligibleEntries": FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    writeAuditLog(tx, {
      action: "REDRAW_STARTED",
      actorId: uid,
      actorRole: admin.role,
      raffleId: input.raffleId,
      targetId: winnerRef.id,
      metadata: { randomizationVersion: RANDOMIZATION_VERSION, replacedWinnerId: disqualifiedWinnerId },
    });
    writeAuditLog(tx, {
      action: "WINNER_SELECTED",
      actorId: uid,
      actorRole: admin.role,
      raffleId: input.raffleId,
      targetId: winnerRef.id,
      metadata: { entryNumber: winningEntry.entryNumber, isRedraw: true },
    });

    return { winnerId: winnerRef.id, status: "completed" as const };
  });
});
