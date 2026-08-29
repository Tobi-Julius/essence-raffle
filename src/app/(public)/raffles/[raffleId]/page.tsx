"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  ShieldCheck,
  Ticket,
  Trophy,
  Upload,
  Users as UsersIcon,
} from "lucide-react";
import { PageSpinner } from "@/components/ui/Spinner";
import { RaffleStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { SanitizedHtml } from "@/components/ui/SanitizedHtml";
import { PrizeShowcase } from "@/components/raffle/PrizeShowcase";
import { useRaffleBundle } from "@/hooks/useRaffleBundle";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/utils/money";
import { formatInRaffleTimezone } from "@/lib/utils/dates";
import { listMyEntriesForRaffle } from "@/services/entries";
import type { RaffleEntry } from "@/types/firestore";

const howItWorks = [
  { icon: ClipboardCheck, text: "Register for the raffle" },
  { icon: ShieldCheck, text: "Accept the Terms & Conditions" },
  { icon: CreditCard, text: "Transfer the entry fee" },
  { icon: Upload, text: "Upload your payment receipt" },
  { icon: FileCheck2, text: "Wait for verification" },
  { icon: Ticket, text: "Receive your official entry number" },
  { icon: Trophy, text: "Participate in the draw" },
];

export default function RaffleDetailsPage() {
  const params = useParams<{ raffleId: string }>();
  const router = useRouter();
  const { raffle, prize, terms, winner, loading, notFound } = useRaffleBundle(params.raffleId);
  const { user, loading: authLoading } = useAuth();
  const [myEntries, setMyEntries] = useState<RaffleEntry[] | null>(null);

  useEffect(() => {
    if (!user || !raffle) return;
    listMyEntriesForRaffle(user.uid, raffle.id).then(setMyEntries);
  }, [user, raffle]);

  if (loading || authLoading) return <PageSpinner />;
  if (notFound || !raffle) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Alert tone="error" title="Raffle not found">
          This raffle doesn&apos;t exist or may have been removed.
        </Alert>
        <Link href="/raffles" className="mt-4 inline-block text-sm text-brand-700 hover:underline">
          Back to raffles
        </Link>
      </div>
    );
  }

  const activeEntry = myEntries?.find((e) => !["cancelled", "rejected"].includes(e.status));
  const isFull = raffle.stats.paymentsApproved >= (raffle.entryConfig.maxParticipants ?? Infinity);
  const canEnterMore =
    !isFull &&
    raffle.entryConfig.allowMultipleEntries &&
    (myEntries?.filter((e) => e.status !== "cancelled" && e.status !== "rejected").length ?? 0) <
      raffle.entryConfig.maxEntriesPerUser;

  return (
    <div>
      <div className="relative h-56 w-full bg-brand-100 sm:h-72">
        {raffle.bannerUrl && <Image src={raffle.bannerUrl} alt="" fill className="object-cover" priority />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-6xl px-4 pb-5 sm:px-6">
          <RaffleStatusBadge status={raffle.status} />
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{raffle.name}</h1>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <Card>
            <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Fact icon={CreditCard} label="Entry fee" value={formatMoney(raffle.payment.entryFee, raffle.payment.currency)} />
              <Fact
                icon={CalendarClock}
                label="Registration closes"
                value={formatInRaffleTimezone(raffle.schedule.registrationEnd, raffle.schedule.timezone, "d MMM, h:mm a")}
              />
              <Fact
                icon={Trophy}
                label="Draw date"
                value={formatInRaffleTimezone(raffle.schedule.drawAt, raffle.schedule.timezone, "d MMM, h:mm a")}
              />
              <Fact icon={UsersIcon} label="Eligibility" value={eligibilityLabel(raffle.eligibility.type)} />
            </CardBody>
          </Card>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">About this raffle</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-600">{raffle.fullDescription}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">How it works</h2>
            <ol className="mt-3 grid gap-3 sm:grid-cols-2">
              {howItWorks.map((step, i) => (
                <li key={step.text} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {i + 1}
                  </span>
                  <span className="text-sm text-neutral-700">{step.text}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">Prize</h2>
            <div className="mt-3">
              <PrizeShowcase prize={prize} />
            </div>
          </section>

          {raffle.status === "COMPLETED" && winner && (
            <Alert tone="success" title="Winner announced">
              {winner.displayName} (entry {winner.entryNumber}) won this raffle. Visit the{" "}
              <Link href="/raffles?tab=completed" className="underline">
                completed raffles
              </Link>{" "}
              tab for more results.
            </Alert>
          )}

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">Eligibility</h2>
            <p className="mt-2 text-sm text-neutral-600">{raffle.eligibility.description || eligibilityLabel(raffle.eligibility.type)}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">Terms &amp; Conditions</h2>
            {terms ? (
              <>
                <div className="mt-3 max-h-40 overflow-hidden rounded-xl border border-neutral-200 p-4">
                  <SanitizedHtml html={terms.contentHtml} />
                </div>
                <Link
                  href={`/raffles/${raffle.id}/terms`}
                  className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline"
                >
                  Read full Terms &amp; Conditions
                </Link>
              </>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">Terms will be published before registration opens.</p>
            )}
          </section>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardBody className="space-y-4">
              <CtaPanel
                raffle={raffle}
                activeEntry={activeEntry}
                canEnterMore={canEnterMore}
                isFull={isFull}
                signedIn={!!user}
                onEnter={() => router.push(user ? `/raffles/${raffle.id}/terms` : `/login?redirect=/raffles/${raffle.id}/terms`)}
                onManage={() => router.push(`/dashboard/raffles/${raffle.id}`)}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof CreditCard; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function eligibilityLabel(type: string): string {
  switch (type) {
    case "everyone":
      return "Everyone is welcome";
    case "employees_only":
      return "Employees only";
    case "customers_only":
      return "Customers only";
    case "specific_group":
      return "Restricted group";
    default:
      return type;
  }
}

function CtaPanel({
  raffle,
  activeEntry,
  canEnterMore,
  isFull,
  signedIn,
  onEnter,
  onManage,
}: {
  raffle: import("@/types/firestore").Raffle;
  activeEntry?: RaffleEntry;
  canEnterMore: boolean;
  isFull: boolean;
  signedIn: boolean;
  onEnter: () => void;
  onManage: () => void;
}) {
  if (raffle.status === "CANCELLED") {
    return <Alert tone="error" title="Raffle cancelled">This raffle has been cancelled and is no longer accepting entries.</Alert>;
  }
  if (raffle.status === "COMPLETED") {
    return (
      <>
        <p className="text-sm text-neutral-600">This raffle has concluded.</p>
        <Link href="/raffles?tab=completed">
          <Button className="w-full" variant="outline">
            View Winners
          </Button>
        </Link>
      </>
    );
  }
  if (raffle.status === "UPCOMING") {
    return (
      <Alert tone="info" title="Registration hasn't opened yet">
        Come back on {formatInRaffleTimezone(raffle.schedule.registrationStart, raffle.schedule.timezone, "d MMM yyyy")} to enter.
      </Alert>
    );
  }
  if (raffle.status === "DRAWING") {
    return (
      <>
        <Alert tone="warning" title="Drawing in progress">Registration has closed — the draw is underway.</Alert>
        <Link href={`/draw/${raffle.id}`} target="_blank">
          <Button className="w-full">Enter Draw</Button>
        </Link>
      </>
    );
  }

  if (isFull && !activeEntry) {
    return (
      <Alert tone="warning" title="Raffle full">
        This raffle has reached its maximum number of participants and is no longer accepting entries.
      </Alert>
    );
  }

  // OPEN
  if (activeEntry && !canEnterMore) {
    if (activeEntry.status === "eligible") {
      return (
        <>
          <Alert tone="success" title="Entry confirmed">
            Your entry number is {activeEntry.entryNumber}.
          </Alert>
          <Button className="w-full" onClick={onManage}>
            View my entry
          </Button>
        </>
      );
    }
    return (
      <>
        <Alert tone="info" title="Payment pending">Complete your bank transfer and send proof via WhatsApp.</Alert>
        <Button className="w-full" onClick={onManage}>
          Continue to payment
        </Button>
      </>
    );
  }

  return (
    <>
      <p className="text-sm text-neutral-600">
        {signedIn
          ? canEnterMore && activeEntry
            ? `You can enter up to ${raffle.entryConfig.maxEntriesPerUser} times. Get another entry to improve your odds.`
            : "Register, accept the terms, and pay the entry fee to join this raffle."
          : "Sign in or create an account to enter this raffle."}
      </p>
      <Button className="w-full" onClick={onEnter}>
        Enter Raffle
      </Button>
      {activeEntry && canEnterMore && (
        <Button className="w-full" variant="outline" onClick={onManage}>
          View my entries
        </Button>
      )}
    </>
  );
}
