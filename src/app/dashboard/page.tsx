"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gift, Trophy } from "lucide-react";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardBody } from "@/components/ui/Card";
import { EntryStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/hooks/useAuth";
import { listMyEntries } from "@/services/entries";
import { getRaffle } from "@/services/raffles";
import type { Raffle, RaffleEntry } from "@/types/firestore";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface EntryWithRaffle {
  entry: RaffleEntry;
  raffle: Raffle | null;
}

function DashboardHome() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<EntryWithRaffle[] | null>(null);

  useEffect(() => {
    if (!user) return;
    listMyEntries(user.uid).then(async (entries) => {
      const raffles = await Promise.all(entries.map((e) => getRaffle(e.raffleId)));
      setItems(entries.map((entry, i) => ({ entry, raffle: raffles[i] })));
    });
  }, [user]);

  if (!items) return <PageSpinner />;

  return (
    <div>
      {searchParams.get("welcome") && (
        <div className="mb-6">
          <Alert tone="success" title="Welcome to Essence Store Raffles">
            Browse open raffles and enter for your chance to win.
          </Alert>
        </div>
      )}
      {searchParams.get("error") === "not-authorized" && (
        <div className="mb-6">
          <Alert tone="warning" title="You don't have access to that page" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">My Raffles</h1>
          <p className="mt-1 text-sm text-neutral-500">Track your entries from registration to the draw.</p>
        </div>
        <Link href="/raffles">
          <Button variant="outline">Browse raffles</Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Gift}
            title="You haven't entered any raffles yet"
            description="Browse open raffles and enter for a chance to win."
            action={
              <Link href="/raffles">
                <Button size="sm">Browse raffles</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map(({ entry, raffle }) => (
            <Link key={entry.id} href={`/dashboard/raffles/${entry.raffleId}`}>
              <Card className="transition hover:border-brand-300">
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {entry.status === "winner" ? (
                      <Trophy className="h-5 w-5 text-brand-600" />
                    ) : (
                      <Gift className="h-5 w-5 text-neutral-400" />
                    )}
                    <div>
                      <p className="font-medium text-neutral-900">{raffle?.name ?? "Raffle"}</p>
                      <p className="text-xs text-neutral-500">Entry {entry.entryNumber}</p>
                    </div>
                  </div>
                  <EntryStatusBadge status={entry.status} />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <DashboardHome />
    </Suspense>
  );
}
