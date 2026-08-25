import { FirebaseError } from "firebase/app";

/**
 * Thrown by the client-side write functions in src/services/** for
 * business-rule failures (e.g. "Registration has closed."). Every message is
 * authored by us and safe to show directly — this is the client-side
 * equivalent of what used to be a Cloud Function's HttpsError message, now
 * that those functions run in the browser instead of on a server.
 */
export class AppError extends Error {}

/**
 * Maps raw Firebase/Cloud Function errors to user-safe copy. Raw error
 * messages, stack traces, and internal details are never shown to users —
 * they are logged (console.error here; wire to an error monitoring provider
 * in production) and a friendly fallback is returned instead.
 */
const KNOWN_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-not-found": "That email or password is incorrect.",
  "auth/wrong-password": "That email or password is incorrect.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Choose a stronger password.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/user-disabled": "This account has been disabled. Contact support.",
  "permission-denied": "You do not have permission to do that.",
};

export function toFriendlyError(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof FirebaseError) {
    if (KNOWN_MESSAGES[error.code]) return KNOWN_MESSAGES[error.code];
  }
  console.error("[essence-raffle] unexpected error", error);
  return "Something went wrong. Please try again, or contact support if it persists.";
}
