import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue } from "../shared/admin";
import { requireUid, requireAdmin, notFound, preconditionFailed } from "../shared/errors";
import { writeAuditLog } from "../shared/audit";
import { disqualifyWinnerSchema, parseOrThrow } from "../shared/validation";
import type { Winner } from "../shared/types";

/**
 * The original winner record is never deleted or overwritten — only marked
 * disqualified, with who/when/why recorded. This opens the raffle's single
 * winner slot back up so an admin can run `redraw`.
 */
export const disqualifyWinner = onCall(async (request) => {
  const uid = requireUid(request);
  const admin = await requireAdmin(uid);
  const input = parseOrThrow(disqualifyWinnerSchema, request.data);

  const winnerRef = db.collection("winners").doc(input.winnerId);

  return db.runTransaction(async (tx) => {
    const winnerSnap = await tx.get(winnerRef);
    if (!winnerSnap.exists) notFound("Winner record not found.");
    const winner = { id: winnerSnap.id, ...winnerSnap.data() } as Winner;

    if (!winner.isActive || winner.status === "disqualified") {
      preconditionFailed("This winner has already been disqualified.");
    }

    const entryRef = db.collection("entries").doc(winner.entryId);
    const raffleRef = db.collection("raffles").doc(winner.raffleId);

    tx.update(winnerRef, {
      status: "disqualified",
      isActive: false,
      disqualifiedBy: uid,
      disqualifiedAt: FieldValue.serverTimestamp(),
      disqualificationReason: input.reason,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(entryRef, {
      status: "disqualified",
      isEligible: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(raffleRef, {
      hasWinner: false,
      currentWinnerEntryId: null,
      "stats.disqualifiedEntries": FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    writeAuditLog(tx, {
      action: "WINNER_DISQUALIFIED",
      actorId: uid,
      actorRole: admin.role,
      raffleId: winner.raffleId,
      targetId: winner.id,
      metadata: { reason: input.reason, entryNumber: winner.entryNumber },
    });
    writeAuditLog(tx, {
      action: "ENTRY_DISQUALIFIED",
      actorId: uid,
      actorRole: admin.role,
      raffleId: winner.raffleId,
      targetId: winner.entryId,
    });

    return { winnerId: winner.id, status: "disqualified" };
  });
});
