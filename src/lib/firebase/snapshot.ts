import { FirestoreError } from "firebase/firestore";

/**
 * Every `onSnapshot` listener in this codebase should route its error
 * through this so that permission-denied — which just means "this document
 * isn't visible to the current user" (a raffle still in draft, a payment
 * that isn't theirs, a profile they lost access to mid-session) — degrades
 * to "no data" instead of an uncaught console error or a scary toast.
 *
 * Firestore invokes the listener's error callback and then tears the
 * listener down; there is nothing to retry, so this always resolves the
 * subscriber to empty rather than leaving it stuck loading forever.
 */
export function isPermissionDenied(error: unknown): boolean {
  return error instanceof FirestoreError && error.code === "permission-denied";
}

export function logSnapshotError(context: string, error: FirestoreError): void {
  if (isPermissionDenied(error)) return; // expected for content the viewer can't see — not a bug
  console.error(`[essence-raffle] snapshot listener failed (${context})`, error);
}
