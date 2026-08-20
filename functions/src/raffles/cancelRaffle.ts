import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue } from "../shared/admin";
import { requireUid, requireAdmin, notFound, preconditionFailed } from "../shared/errors";
import { writeAuditLog } from "../shared/audit";
import { cancelRaffleSchema, parseOrThrow } from "../shared/validation";
import type { Raffle } from "../shared/types";

export const cancelRaffle = onCall(async (request) => {
  const uid = requireUid(request);
  const admin = await requireAdmin(uid);
  const input = parseOrThrow(cancelRaffleSchema, request.data);

  const raffleRef = db.collection("raffles").doc(input.raffleId);

  return db.runTransaction(async (tx) => {
    const raffleSnap = await tx.get(raffleRef);
    if (!raffleSnap.exists) notFound("Raffle not found.");
    const raffle = raffleSnap.data() as Raffle;

    if (raffle.status === "COMPLETED" || raffle.status === "CANCELLED") {
      preconditionFailed("This raffle can no longer be cancelled.");
    }

    tx.update(raffleRef, { status: "CANCELLED", updatedAt: FieldValue.serverTimestamp() });
    writeAuditLog(tx, {
      action: "RAFFLE_CANCELLED",
      actorId: uid,
      actorRole: admin.role,
      raffleId: input.raffleId,
      metadata: { reason: input.reason, previousStatus: raffle.status },
    });
    return { raffleId: input.raffleId, status: "CANCELLED" };
  });
});
