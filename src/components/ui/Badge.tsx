import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import {
  RAFFLE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  ENTRY_STATUS_LABELS,
  WINNER_STATUS_LABELS,
  type RaffleStatus,
  type PaymentStatus,
  type EntryStatus,
  type WinnerStatus,
} from "@/types/firestore";

type Tone = "neutral" | "brand" | "success" | "warning" | "error" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  brand: "bg-brand-100 text-brand-800",
  success: "bg-success-soft text-brand-800",
  warning: "bg-warning-soft text-amber-800",
  error: "bg-error-soft text-red-800",
  info: "bg-info-soft text-blue-800",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

const raffleStatusTone: Record<RaffleStatus, Tone> = {
  DRAFT: "neutral",
  UPCOMING: "info",
  OPEN: "success",
  DRAWING: "warning",
  COMPLETED: "brand",
  CANCELLED: "error",
};

export function RaffleStatusBadge({ status }: { status: RaffleStatus }) {
  return <Badge tone={raffleStatusTone[status]}>{RAFFLE_STATUS_LABELS[status]}</Badge>;
}

const paymentStatusTone: Record<PaymentStatus, Tone> = {
  pending: "neutral",
  verification_pending: "warning",
  approved: "success",
  rejected: "error",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentStatusTone[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

const entryStatusTone: Record<EntryStatus, Tone> = {
  payment_pending: "neutral",
  verification_pending: "warning",
  eligible: "success",
  rejected: "error",
  cancelled: "neutral",
  disqualified: "error",
  winner: "brand",
};

export function EntryStatusBadge({ status }: { status: EntryStatus }) {
  return <Badge tone={entryStatusTone[status]}>{ENTRY_STATUS_LABELS[status]}</Badge>;
}

const winnerStatusTone: Record<WinnerStatus, Tone> = {
  pending_verification: "warning",
  verified: "info",
  disqualified: "error",
  prize_assigned: "brand",
  claimed: "success",
};

export function WinnerStatusBadge({ status }: { status: WinnerStatus }) {
  return <Badge tone={winnerStatusTone[status]}>{WINNER_STATUS_LABELS[status]}</Badge>;
}
