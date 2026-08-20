import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue, authAdmin } from "../shared/admin";
import { requireUid, requireSuperAdmin, notFound, preconditionFailed } from "../shared/errors";
import { writeAuditLogDirect } from "../shared/audit";
import { setUserActiveSchema, parseOrThrow } from "../shared/validation";

export const setUserActive = onCall(async (request) => {
  const uid = requireUid(request);
  const admin = await requireSuperAdmin(uid);
  const input = parseOrThrow(setUserActiveSchema, request.data);

  if (input.userId === uid && !input.isActive) {
    preconditionFailed("You cannot deactivate your own account.");
  }

  const userRef = db.collection("users").doc(input.userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) notFound("User not found.");

  await authAdmin.updateUser(input.userId, { disabled: !input.isActive });
  await userRef.update({ isActive: input.isActive, updatedAt: FieldValue.serverTimestamp() });

  await writeAuditLogDirect({
    action: input.isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
    actorId: uid,
    actorRole: admin.role,
    targetId: input.userId,
  });

  return { ok: true as const };
});
