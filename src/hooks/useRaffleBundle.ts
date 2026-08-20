"use client";

import { useEffect, useState } from "react";
import { getRaffle } from "@/services/raffles";
import { getPrize, watchPrize } from "@/services/prizes";
import { getActiveTerms } from "@/services/terms";
import { getActiveWinner } from "@/services/winners";
import type { Prize, Raffle, RaffleTerms, Winner } from "@/types/firestore";
import { toFriendlyError } from "@/lib/errors";
import { isPermissionDenied } from "@/lib/firebase/snapshot";

interface RaffleBundle {
  raffle: Raffle | null;
  prize: Prize | null;
  terms: RaffleTerms | null;
  winner: Winner | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
}

export function useRaffleBundle(raffleId: string): RaffleBundle {
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [terms, setTerms] = useState<RaffleTerms | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    Promise.all([getRaffle(raffleId), getPrize(raffleId), getActiveTerms(raffleId)])
      .then(async ([r, p, t]) => {
        if (cancelled) return;
        if (!r) {
          setNotFound(true);
          return;
        }
        setRaffle(r);
        setPrize(p);
        setTerms(t);
        if (r.status === "COMPLETED") {
          setWinner(await getActiveWinner(raffleId));
        }
      })
      .catch((e) => {
        if (cancelled) return;
        // A denied read here just means this raffle isn't visible to the
        // current viewer (still a draft, or was cancelled/removed) — treat
        // it the same as "doesn't exist" rather than surfacing a
        // permissions error for something the user never had a reason to
        // expect access to.
        if (isPermissionDenied(e)) {
          setNotFound(true);
        } else {
          setError(toFriendlyError(e));
        }
      })
      .finally(() => !cancelled && setLoading(false));

    const unsubPrize = watchPrize(raffleId, setPrize);
    return () => {
      cancelled = true;
      unsubPrize();
    };
  }, [raffleId]);

  return { raffle, prize, terms, winner, loading, error, notFound };
}
