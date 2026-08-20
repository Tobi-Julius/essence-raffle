import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue } from "../shared/admin";
import { requireUid, requireAdmin, notFound, preconditionFailed } from "../shared/errors";
import { writeAuditLog } from "../shared/audit";
import { publishTermsSchema, parseOrThrow } from "../shared/validation";
import type { RaffleTerms } from "../shared/types";

/**
 * Promotes a draft terms version to active, archiving whatever was
 * previously active. Published/archived terms are never edited or deleted
 * again — participants who already accepted an earlier version keep that
 * exact version recorded on their entry, regardless of what happens here.
 */
export const publishTerms = onCall(async (request) => {
  const uid = requireUid(request);
  const admin = await requireAdmin(uid);
  const input = parseOrThrow(publishTermsSchema, request.data);

  const raffleRef = db.collection("raffles").doc(input.raffleId);
  const termsCol = raffleRef.collection("terms");
  const draftRef = termsCol.doc(input.termsId);

  return db.runTransaction(async (tx) => {
    const [raffleSnap, draftSnap, activeSnap] = await Promise.all([
      tx.get(raffleRef),
      tx.get(draftRef),
      tx.get(termsCol.where("status", "==", "active")),
    ]);

    if (!raffleSnap.exists) notFound("Raffle not found.");
    if (!draftSnap.exists) notFound("Terms draft not found.");
    const draft = { id: draftSnap.id, ...draftSnap.data() } as RaffleTerms;
    if (draft.status !== "draft") preconditionFailed("Only a draft version can be published.");

    for (const activeDoc of activeSnap.docs) {
      tx.update(activeDoc.ref, { status: "archived", updatedAt: FieldValue.serverTimestamp() });
    }

    tx.update(draftRef, { status: "active", updatedAt: FieldValue.serverTimestamp() });
    tx.update(raffleRef, {
      activeTermsId: draft.id,
      activeTermsVersion: draft.version,
      updatedAt: FieldValue.serverTimestamp(),
    });

    writeAuditLog(tx, {
      action: "TERMS_PUBLISHED",
      actorId: uid,
      actorRole: admin.role,
      raffleId: input.raffleId,
      targetId: draft.id,
      metadata: { version: draft.version },
    });

    return { termsId: draft.id, version: draft.version };
  });
});
