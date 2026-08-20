import { onCall } from "firebase-functions/v2/https";
import { db } from "../shared/admin";
import { requireUid, requireAdmin, notFound } from "../shared/errors";
import { writeAuditLogDirect } from "../shared/audit";
import { updateDrawPresentationSchema, parseOrThrow } from "../shared/validation";

/**
 * Controls what the public /draw/[raffleId] screen shows. The actual
 * winner was already determined by startDraw — this only paces the live
 * reveal (READY -> DRAWING -> REVEALING -> WINNER_REVEALED -> COMPLETED),
 * which is why it's safe for an admin to step through it manually while
 * presenting to a room, hand-driving the timing for the crowd.
 */
export const updateDrawPresentation = onCall(async (request) => {
  const uid = requireUid(request);
  const admin = await requireAdmin(uid);
  const input = parseOrThrow(updateDrawPresentationSchema, request.data);

  const drawSnap = await db
    .collection("draws")
    .where("raffleId", "==", input.raffleId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (drawSnap.empty) notFound("No draw found for this raffle.");
  const drawRef = drawSnap.docs[0]!.ref;

  await drawRef.update({ presentationState: input.presentationState });
  await writeAuditLogDirect({
    action: "DRAW_PRESENTATION_UPDATED",
    actorId: uid,
    actorRole: admin.role,
    raffleId: input.raffleId,
    targetId: drawRef.id,
    metadata: { presentationState: input.presentationState },
  });

  return { ok: true as const };
});
