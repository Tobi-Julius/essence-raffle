import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { db } from "./admin";
import type { UserProfile, UserRole } from "./types";

/**
 * Every callable in this codebase starts by calling one of these. They are
 * the actual authorization boundary — the client-side role checks in the
 * Next.js app are UX only. A request that fails these throws before any
 * data is read or written.
 */
export function requireUid(request: CallableRequest): string {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Please sign in and try again.");
  }
  return request.auth.uid;
}

export async function requireActiveUser(uid: string): Promise<UserProfile> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "Your account profile could not be found.");
  }
  const profile = { id: snap.id, ...snap.data() } as UserProfile;
  if (!profile.isActive) {
    throw new HttpsError("permission-denied", "Your account has been deactivated. Contact support.");
  }
  return profile;
}

const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];

export async function requireAdmin(uid: string): Promise<UserProfile> {
  const profile = await requireActiveUser(uid);
  if (!ADMIN_ROLES.includes(profile.role)) {
    throw new HttpsError("permission-denied", "You do not have permission to do that.");
  }
  return profile;
}

export async function requireSuperAdmin(uid: string): Promise<UserProfile> {
  const profile = await requireActiveUser(uid);
  if (profile.role !== "super_admin") {
    throw new HttpsError("permission-denied", "Only a super admin can do that.");
  }
  return profile;
}

export function badRequest(message: string): never {
  throw new HttpsError("invalid-argument", message);
}

export function conflict(message: string): never {
  throw new HttpsError("already-exists", message);
}

export function notFound(message: string): never {
  throw new HttpsError("not-found", message);
}

export function preconditionFailed(message: string): never {
  throw new HttpsError("failed-precondition", message);
}
