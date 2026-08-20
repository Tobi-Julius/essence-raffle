"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PartyPopper, Ticket, Trophy } from "lucide-react";
import { getRaffle } from "@/services/raffles";
import { getPrize } from "@/services/prizes";
import { watchLatestDraw } from "@/services/draws";
import { watchActiveWinner } from "@/services/winners";
import { EntryFlicker } from "@/components/draw/EntryFlicker";
import { formatMoney } from "@/lib/utils/money";
import type { Draw, Prize, Raffle, Winner } from "@/types/firestore";

const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Essence Store";

export default function PublicDrawScreen() {
  const params = useParams<{ raffleId: string }>();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);

  useEffect(() => {
    getRaffle(params.raffleId).then(setRaffle);
    getPrize(params.raffleId).then(setPrize);
    const unsubDraw = watchLatestDraw(params.raffleId, setDraw);
    const unsubWinner = watchActiveWinner(params.raffleId, setWinner);
    return () => {
      unsubDraw();
      unsubWinner();
    };
  }, [params.raffleId]);

  if (!raffle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Loading…
      </div>
    );
  }

  const state = draw?.presentationState ?? "READY";
  const entryPrefix = raffle.slug.slice(0, 3).toUpperCase() || "RFL";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-950 via-neutral-950 to-neutral-950 px-6 py-10 text-center text-white">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white p-1.5">
          <Image src="/brand/essence-logo.jpg" alt="" width={120} height={40} className="h-8 w-auto" />
        </div>
        <span className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">{companyName}</span>
      </div>

      <h1 className="mt-6 max-w-3xl text-2xl font-semibold text-neutral-200 sm:text-3xl">{raffle.name}</h1>

      {prize && (
        <p className="mt-2 flex items-center gap-2 text-brand-300">
          <Trophy className="h-5 w-5" /> {prize.name}
          {typeof prize.value === "number" && prize.currency && ` · ${formatMoney(prize.value, prize.currency)}`}
        </p>
      )}

      <div className="mt-14 flex flex-1 flex-col items-center justify-center">
        {(state === "READY" || !draw) && (
          <div className="flex flex-col items-center gap-4 text-neutral-400">
            <Ticket className="h-14 w-14" />
            <p className="text-xl">The draw hasn&apos;t started yet.</p>
          </div>
        )}

        {state === "DRAWING" && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-lg uppercase tracking-[0.3em] text-brand-300">Drawing</p>
            <EntryFlicker prefix={entryPrefix} />
          </div>
        )}

        {state === "REVEALING" && (
          <div className="flex flex-col items-center gap-6">
            <p className="animate-pulse text-lg uppercase tracking-[0.3em] text-brand-300">Revealing winner</p>
            <EntryFlicker prefix={entryPrefix} speedMs={260} />
          </div>
        )}

        {(state === "WINNER_REVEALED" || state === "COMPLETED") && winner && (
          <div className="flex flex-col items-center gap-4">
            <PartyPopper className="h-14 w-14 text-brand-300" />
            <p className="text-xl font-medium uppercase tracking-[0.3em] text-brand-300">Winner</p>
            <p className="font-mono text-5xl font-bold text-white sm:text-7xl">{winner.entryNumber}</p>
            <p className="text-2xl text-neutral-200">{winner.displayName}</p>
            {prize && (
              <p className="mt-2 text-lg text-brand-300">
                {prize.name}
                {typeof prize.value === "number" && prize.currency && ` · ${formatMoney(prize.value, prize.currency)}`}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-600">Winner selection is performed securely on the server.</p>
    </div>
  );
}
