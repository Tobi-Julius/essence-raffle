"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { RaffleGrid } from "@/components/raffle/RaffleGrid";
import { RaffleCard } from "@/components/raffle/RaffleCard";
import { RaffleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { searchRafflesByName } from "@/services/raffles";
import type { Raffle, RaffleListSection } from "@/types/firestore";

function RafflesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as RaffleListSection) ?? "present";
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Raffle[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch(term: string) {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      setSearchResults(await searchRafflesByName(term));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Raffles</h1>
          <p className="mt-1 text-sm text-neutral-500">Browse present, upcoming, and completed Essence Store raffles.</p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search raffles…"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search raffles by name"
          />
        </div>
      </div>

      {searchTerm ? (
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-neutral-500">
            <Search className="h-4 w-4" /> Results for &ldquo;{searchTerm}&rdquo;
          </div>
          {searching ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <RaffleCardSkeleton key={i} />
              ))}
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((r) => (
                <RaffleCard key={r.id} raffle={r} />
              ))}
            </div>
          ) : (
            <EmptyState title="No raffles matched your search" description="Try a different name." />
          )}
        </div>
      ) : (
        <>
          <Tabs
            className="mt-6"
            value={tab}
            onChange={(v) => router.push(`/raffles?tab=${v}`)}
            items={[
              { value: "present", label: "Present" },
              { value: "upcoming", label: "Upcoming" },
              { value: "completed", label: "Completed" },
            ]}
          />
          <div className="mt-6">
            <RaffleGrid section={tab} />
          </div>
        </>
      )}
    </div>
  );
}

export default function RafflesPage() {
  return (
    <Suspense fallback={null}>
      <RafflesPageContent />
    </Suspense>
  );
}
