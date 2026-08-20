"use client";

import { useEffect, useState } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { RaffleCard } from "@/components/raffle/RaffleCard";
import { RaffleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { listRafflesBySection } from "@/services/raffles";
import { toFriendlyError } from "@/lib/errors";
import { Alert } from "@/components/ui/Alert";
import type { Raffle, RaffleListSection } from "@/types/firestore";
import { Gift } from "lucide-react";

const emptyCopy: Record<RaffleListSection, { title: string; description: string }> = {
  present: { title: "No raffles are open right now", description: "Check back soon, or browse upcoming raffles." },
  upcoming: { title: "No upcoming raffles", description: "New raffles will appear here once they're published." },
  completed: { title: "No completed raffles yet", description: "Results and winners will appear here once a draw finishes." },
};

export function RaffleGrid({
  section,
  pageSize = 12,
  hidePagination = false,
}: {
  section: RaffleListSection;
  pageSize?: number;
  hidePagination?: boolean;
}) {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<Raffle> | null>(null);
  const [history, setHistory] = useState<(QueryDocumentSnapshot<Raffle> | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
    setHistory([null]);
  }, [section]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listRafflesBySection(section, { pageSize, cursor: history[pageIndex] })
      .then((page) => {
        if (cancelled) return;
        setRaffles(page.raffles);
        setCursor(page.cursor);
      })
      .catch((e) => !cancelled && setError(toFriendlyError(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [section, pageSize, pageIndex, history]);

  if (error) return <Alert tone="error">{error}</Alert>;

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: pageSize > 6 ? 6 : pageSize }).map((_, i) => (
          <RaffleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (raffles.length === 0) {
    return <EmptyState icon={Gift} title={emptyCopy[section].title} description={emptyCopy[section].description} />;
  }

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {raffles.map((raffle) => (
          <RaffleCard key={raffle.id} raffle={raffle} />
        ))}
      </div>
      {!hidePagination && (
        <Pagination
          hasPrevious={pageIndex > 0}
          hasNext={!!cursor}
          onPrevious={() => setPageIndex((i) => Math.max(0, i - 1))}
          onNext={() => {
            if (!cursor) return;
            setHistory((h) => [...h.slice(0, pageIndex + 1), cursor]);
            setPageIndex((i) => i + 1);
          }}
        />
      )}
    </div>
  );
}
