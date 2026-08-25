import Image from "next/image";
import Link from "next/link";
import { CalendarClock, Ticket } from "lucide-react";
import { RaffleStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils/money";
import { formatInRaffleTimezone } from "@/lib/utils/dates";
import type { Raffle } from "@/types/firestore";

function ctaFor(raffle: Raffle): { label: string; disabled?: boolean } {
  switch (raffle.status) {
    case "OPEN":
      return { label: "Enter Raffle" };
    case "DRAWING":
      return { label: "Drawing Soon" };
    case "UPCOMING":
      return { label: "Coming Soon" };
    case "COMPLETED":
      return { label: "View Results" };
    case "CANCELLED":
      return { label: "Cancelled", disabled: true };
    default:
      return { label: "View Details" };
  }
}

export function RaffleCard({ raffle }: { raffle: Raffle }) {
  const cta = ctaFor(raffle);
  return (
    <Link className="flex flex-col overflow-hidden" href={`/raffles/${raffle.id}`}>
      <div className="relative h-40 w-full bg-brand-100">
        {raffle.bannerUrl ? (
          <Image src={raffle.bannerUrl} alt="" fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-400">
            <Ticket className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <RaffleStatusBadge status={raffle.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-semibold text-neutral-900">{raffle.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{raffle.shortDescription}</p>
        </div>
        <div className="flex flex-col gap-1.5 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            {raffle.status === "COMPLETED"
              ? `Drawn ${formatInRaffleTimezone(raffle.schedule.drawAt, raffle.schedule.timezone, "d MMM yyyy")}`
              : `Draws ${formatInRaffleTimezone(raffle.schedule.drawAt, raffle.schedule.timezone, "d MMM yyyy")}`}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-brand-700">{formatMoney(raffle.payment.entryFee, raffle.payment.currency)}</span>
         
            <Button size="sm" disabled={cta.disabled}>
              {cta.label}
            </Button>
         
        </div>
      </div>
    </Link>
  );
}
