"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { PageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryStatusBadge, RaffleStatusBadge } from "@/components/ui/Badge";
import { LivePaymentCard } from "@/components/payment/LivePaymentCard";
import { PrizeShowcase } from "@/components/raffle/PrizeShowcase";
import { useAuth } from "@/hooks/useAuth";
import { getRaffle } from "@/services/raffles";
import { getPrize } from "@/services/prizes";
import { listMyEntriesForRaffle } from "@/services/entries";
import { getPayment } from "@/services/payments";
import { formatMoney } from "@/lib/utils/money";
import { isPermissionDenied } from "@/lib/firebase/snapshot";
import { toFriendlyError } from "@/lib/errors";
import { useToast } from "@/components/ui/Toast";
import type { Payment, Prize, Raffle, RaffleEntry } from "@/types/firestore";

interface EntryWithPayment {
  entry: RaffleEntry;
  payment: Payment | null;
}

export default function ParticipantRafflePage() {
  const params = useParams<{ raffleId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { show } = useToast();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [items, setItems] = useState<EntryWithPayment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    setNotFound(false);
    try {
      const [r, p, entries] = await Promise.all([
        getRaffle(params.raffleId),
        getPrize(params.raffleId),
        listMyEntriesForRaffle(user.uid, params.raffleId),
      ]);
      if (!r) {
        setNotFound(true);
        return;
      }
      setRaffle(r);
      setPrize(p);
      const payments = await Promise.all(entries.map((e) => getPayment(e.paymentId)));
      setItems(entries.map((entry, i) => ({ entry, payment: payments[i] })));
    } catch (e) {
      // A denied read here means this raffle isn't visible to the current
      // user (e.g. it's a draft, or was cancelled) — treat it as "not
      // found" rather than showing a permissions error for a page the user
      // has no reason to expect access to.
      if (isPermissionDenied(e)) {
        setNotFound(true);
      } else {
        show("error", toFriendlyError(e));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, params.raffleId]);

  if (authLoading || loading) return <PageSpinner />;

  if (notFound || !raffle) {
    return (
      <EmptyState
        title="Raffle not found"
        description="This raffle doesn't exist, or isn't available to you."
        action={
          <Link href="/dashboard">
            <Button size="sm">Back to my raffles</Button>
          </Link>
        }
      />
    );
  }

  const activeEntries = items?.filter((i) => i.entry.status !== "cancelled" && i.entry.status !== "rejected") ?? [];
  const canAddEntry =
    raffle.status === "OPEN" &&
    raffle.entryConfig.allowMultipleEntries &&
    activeEntries.length < raffle.entryConfig.maxEntriesPerUser;
  const wonEntry = items?.find((i) => i.entry.status === "winner");

  return (
    <div>
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800">
        <ArrowLeft className="h-4 w-4" /> My raffles
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-neutral-900">{raffle.name}</h1>
            <RaffleStatusBadge status={raffle.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">Entry fee {formatMoney(raffle.payment.entryFee, raffle.payment.currency)}</p>
        </div>
        {canAddEntry && (
          <Link href={`/raffles/${raffle.id}/terms`}>
            <Button variant="outline">
              <Plus className="h-4 w-4" /> Add another entry
            </Button>
          </Link>
        )}
      </div>

      {wonEntry && (
        <div className="mt-6">
          <Alert tone="success" title="🎉 Congratulations, you won!">
            Entry {wonEntry.entry.entryNumber} was selected as the winner. Our team will be in touch about claiming your prize.
          </Alert>
        </div>
      )}

      {items && items.length === 0 && (
        <div className="mt-6">
          <Alert tone="info" title="No entry found">
            You haven&apos;t registered for this raffle yet.
          </Alert>
          <Link href={`/raffles/${raffle.id}`} className="mt-3 inline-block">
            <Button>View raffle</Button>
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {items
            ?.filter((i) => i.entry.status !== "cancelled")
            .map(({ entry, payment }) => (
              <div key={entry.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm font-medium text-neutral-700">Entry {entry.entryNumber}</p>
                  <EntryStatusBadge status={entry.status} />
                </div>
                {payment && <LivePaymentCard paymentId={payment.id} raffle={raffle} userId={user!.uid} />}
              </div>
            ))}
        </div>
        <div className="space-y-6">
          <PrizeShowcase prize={prize} />
        </div>
      </div>
    </div>
  );
}
