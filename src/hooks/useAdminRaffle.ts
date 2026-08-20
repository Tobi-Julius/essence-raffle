"use client";

import { useCallback, useEffect, useState } from "react";
import { getRaffle } from "@/services/raffles";
import { getPrize } from "@/services/prizes";
import { getActiveTerms } from "@/services/terms";
import type { Prize, Raffle, RaffleTerms } from "@/types/firestore";

export function useAdminRaffle(raffleId: string) {
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [terms, setTerms] = useState<RaffleTerms | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [r, p, t] = await Promise.all([getRaffle(raffleId), getPrize(raffleId), getActiveTerms(raffleId)]);
    setRaffle(r);
    setPrize(p);
    setTerms(t);
    setLoading(false);
  }, [raffleId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { raffle, prize, terms, loading, refresh };
}
