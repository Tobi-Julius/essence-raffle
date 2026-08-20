import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue } from "../shared/admin";
import { requireUid, requireAdmin, notFound, preconditionFailed } from "../shared/errors";
import { writeAuditLog } from "../shared/audit";
import { claimPrizeSchema, parseOrThrow } from "../shared/validation";
import type { Winner } from "../shared/types";

export const claimPrize = onCall(async (request) => {
  const uid = requireUid(request);
  const admin = await requireAdmin(uid);
  const input = parseOrThrow(claimPrizeSchema, request.data);

  const prizeRef = db.collection("prizes").doc(input.raffleId);

  return db.runTransaction(async (tx) => {
    const prizeSnap = await tx.get(prizeRef);
    if (!prizeSnap.exists) notFound("Prize not found.");

    const winnerSnap = await tx.get(
      db.collection("winners").where("raffleId", "==", input.raffleId).where("isActive", "==", true).limit(1),
    );
    if (winnerSnap.empty) preconditionFailed("There is no active winner for this raffle.");
    const winner = { id: winnerSnap.docs[0]!.id, ...winnerSnap.docs[0]!.data() } as Winner;

    if (prizeSnap.data()?.status === "claimed") preconditionFailed("This prize has already been claimed.");

    tx.update(prizeRef, {
      status: "claimed",
      claimedAt: FieldValue.serverTimestamp(),
      claimedBy: winner.userId,
      verifiedBy: uid,
      claimNotes: input.claimNotes ?? null,
      deliveryMethod: input.deliveryMethod ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(db.collection("winners").doc(winner.id), {
      status: "claimed",
      updatedAt: FieldValue.serverTimestamp(),
    });

    writeAuditLog(tx, {
      action: "PRIZE_CLAIMED",
      actorId: uid,
      actorRole: admin.role,
      raffleId: input.raffleId,
      targetId: winner.id,
    });

    return { ok: true as const };
  });
});
