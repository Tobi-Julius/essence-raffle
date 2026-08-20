import type { UserRole } from "@/types/firestore";

/**
 * These helpers gate UI affordances only (hiding an "Approve" button, etc).
 * They are NOT the source of authorization truth — every privileged action
 * they gate is re-checked server-side (Firestore rules and/or Cloud
 * Functions) regardless of what the client believes the role is.
 */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === "super_admin";
}

export function canReviewPayments(role: UserRole | null | undefined): boolean {
  return isAdmin(role);
}

export function canManageAdmins(role: UserRole | null | undefined): boolean {
  return isSuperAdmin(role);
}
