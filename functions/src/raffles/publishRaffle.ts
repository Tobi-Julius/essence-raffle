import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue } from "../shared/admin";
import { requireUid, requireAdmin, notFound, preconditionFailed } from "../shared/errors";
import { writeAuditLog } from "../shared/audit";
import { raffleIdSchema, parseOrThrow } from "../shared/validation";
import { computeLifecycleStatus } from "../shared/schedule";
import type { Raffle } from "../shared/types";

/**
 * DRAFT -> UPCOMING/OPEN. Re-validates the checklist the admin UI shows
 * (prize configured, terms published) server-side rather than trusting the
 * client's checkmarks — a client could otherwise publish an incomplete
 * raffle by calling this directly.
 */
export const publishRaffle = onCall(async (request) => {
  const uid = requireUid(request);
  const admin = await requireAdmin(uid);
  const { raffleId } = parseOrThrow(raffleIdSchema, request.data);

  const raffleRef = db.collection("raffles").doc(raffleId);

  return db.runTransaction(async (tx) => {
    const [raffleSnap, prizeSnap] = await Promise.all([tx.get(raffleRef), tx.get(db.collection("prizes").doc(raffleId))]);
    if (!raffleSnap.exists) notFound("Raffle not found.");
    const raffle = { id: raffleSnap.id, ...raffleSnap.data() } as Raffle;

    if (raffle.status !== "DRAFT") preconditionFailed("Only draft raffles can be published.");
    if (!prizeSnap.exists) preconditionFailed("Add a prize before publishing.");
    if (!raffle.activeTermsId) preconditionFailed("Publish the Terms & Conditions before publishing the raffle.");

    const lifecycle = computeLifecycleStatus(raffle.schedule);
    const nextStatus = lifecycle === "READY_FOR_DRAW" ? "DRAWING" : lifecycle;

    tx.update(raffleRef, { status: nextStatus, updatedAt: FieldValue.serverTimestamp() });
    writeAuditLog(tx, {
      action: "RAFFLE_PUBLISHED",
      actorId: uid,
      actorRole: admin.role,
      raffleId,
      metadata: { status: nextStatus },
    });
    return { raffleId, status: nextStatus };
  });
});
