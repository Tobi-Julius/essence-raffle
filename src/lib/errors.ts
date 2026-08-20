import { FirebaseError } from "firebase/app";

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
  "functions/permission-denied": "You do not have permission to do that.",
  "functions/failed-precondition": "That action isn't available right now.",
  "functions/already-exists": "This has already been processed.",
  "functions/not-found": "We couldn't find that record.",
  "functions/unauthenticated": "Please sign in and try again.",
  "functions/resource-exhausted": "You've reached the limit for this action.",
  "functions/deadline-exceeded": "That took too long. Please try again.",
};

export function toFriendlyError(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (KNOWN_MESSAGES[error.code]) return KNOWN_MESSAGES[error.code];
    if (typeof error.message === "string" && error.code.startsWith("functions/")) {
      // Callable HttpsError messages are authored by us and are already safe.
      return error.message;
    }
  }
  console.error("[essence-raffle] unexpected error", error);
  return "Something went wrong. Please try again, or contact support if it persists.";
}
