import { beforeUserCreated } from "firebase-functions/v2/identity";
import { authAdmin } from "../shared/admin";

/**
 * Every new Firebase Auth user gets the "participant" custom claim by
 * default, before the account is even created — nobody can register their
 * way into a different role. Elevating to admin/super_admin is only
 * possible via the `setUserRole` callable.
 */
export const onUserCreate = beforeUserCreated(async () => {
  return { customClaims: { role: "participant" } };
});

// Safety net: if a user somehow ends up without the claim (e.g. imported
// via a mechanism that bypasses the blocking trigger), this keeps the two
// role sources reconcilable. Not wired to a trigger — invoked defensively
// from setUserRole-adjacent tooling if ever needed.
export async function ensureDefaultClaim(uid: string): Promise<void> {
  const user = await authAdmin.getUser(uid);
  if (!user.customClaims?.role) {
    await authAdmin.setCustomUserClaims(uid, { role: "participant" });
  }
}
