import { formatInTimeZone } from "date-fns-tz";
import type { Timestamp } from "firebase/firestore";

export function toDate(ts: Timestamp | Date | null | undefined): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  return ts.toDate();
}

/**
 * Formats a Firestore Timestamp in the raffle's authoritative IANA timezone.
 * The backend is authoritative for whether a raffle is open — this is purely
 * a display helper.
 */
export function formatInRaffleTimezone(
  ts: Timestamp | Date | null | undefined,
  timezone: string,
  pattern = "d MMM yyyy, h:mm a zzz",
): string {
  const date = toDate(ts);
  if (!date) return "—";
  return formatInTimeZone(date, timezone, pattern);
}

export function formatDateShort(ts: Timestamp | Date | null | undefined): string {
  const date = toDate(ts);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(date);
}

export function formatDateTime(ts: Timestamp | Date | null | undefined): string {
  const date = toDate(ts);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function relativeTimeFrom(ts: Timestamp | Date | null | undefined): string {
  const date = toDate(ts);
  if (!date) return "—";
  const diffMs = date.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diffMin);
  if (abs < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  const diffDay = Math.round(diffHr / 24);
  return rtf.format(diffDay, "day");
}
