import type { Timestamp } from "firebase-admin/firestore";
import type { RaffleSchedule } from "./types";

/**
 * The backend is authoritative for raffle timing — never the browser clock.
 * This is used both when publishing a raffle and by the scheduled function
 * that sweeps raffles forward through UPCOMING -> OPEN -> DRAWING.
 */
export function computeLifecycleStatus(schedule: RaffleSchedule, now: Date = new Date()): "UPCOMING" | "OPEN" | "READY_FOR_DRAW" {
  const start = (schedule.registrationStart as Timestamp).toDate();
  const end = (schedule.registrationEnd as Timestamp).toDate();
  if (now < start) return "UPCOMING";
  if (now <= end) return "OPEN";
  return "READY_FOR_DRAW";
}
