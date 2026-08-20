import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue, authAdmin } from "../shared/admin";
import { requireUid, requireSuperAdmin, notFound, preconditionFailed } from "../shared/errors";
import { writeAuditLogDirect } from "../shared/audit";
import { setUserRoleSchema, parseOrThrow } from "../shared/validation";

/**
 * The only way a user's role can change. Sets the Firebase Auth custom
 * claim (what Firestore/Storage security rules check) AND mirrors it onto
 * the Firestore profile (what the UI reads) so the two never disagree.
 * Nothing in Firestore rules allows a client to write `role` directly.
 */
export const setUserRole = onCall(async (request) => {
  const uid = requireUid(request);
  const admin = await requireSuperAdmin(uid);
  const input = parseOrThrow(setUserRoleSchema, request.data);

  if (input.userId === uid) {
    preconditionFailed("You cannot change your own role.");
  }

  const userRef = db.collection("users").doc(input.userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) notFound("User not found.");
  const previousRole = userSnap.data()?.role as string;

  await authAdmin.setCustomUserClaims(input.userId, { role: input.role });
  await userRef.update({ role: input.role, updatedAt: FieldValue.serverTimestamp() });

  await writeAuditLogDirect({
    action: "ADMIN_ROLE_CHANGED",
    actorId: uid,
    actorRole: admin.role,
    targetId: input.userId,
    metadata: { previousRole, newRole: input.role },
  });

  return { ok: true as const };
});
