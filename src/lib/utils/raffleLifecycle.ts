import type { Timestamp } from "firebase/firestore";
import type { RaffleSchedule } from "@/types/firestore";

/**
 * The backend used to be authoritative for raffle timing via a scheduled
 * Cloud Function sweep (removed — see useRaffleStatusSweep, which now calls
 * this from the browser instead, on whatever cadence an admin has /admin
 * open). Never trust the browser clock alone for anything security-critical;
 * this is UX/lifecycle bookkeeping, not an authorization boundary — the
 * actual write is still gated by firestore.rules' request.time checks.
 */
export function computeLifecycleStatus(
  schedule: RaffleSchedule,
  now: Date = new Date(),
): "UPCOMING" | "OPEN" | "READY_FOR_DRAW" {
  const start = (schedule.registrationStart as Timestamp).toDate();
  const end = (schedule.registrationEnd as Timestamp).toDate();
  if (now < start) return "UPCOMING";
  if (now <= end) return "OPEN";
  return "READY_FOR_DRAW";
}
