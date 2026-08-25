"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { RaffleStatusBadge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Checkbox } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { RaffleSubNav } from "@/components/admin/RaffleSubNav";
import { useAdminRaffle } from "@/hooks/useAdminRaffle";
import { publishRaffle } from "@/services/raffles";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/utils/money";
import { formatInRaffleTimezone } from "@/lib/utils/dates";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyError } from "@/lib/errors";

export default function AdminRaffleOverviewPage() {
  const params = useParams<{ raffleId: string }>();
  const { raffle, prize, terms, loading, refresh } = useAdminRaffle(
    params.raffleId,
  );
  const { user, role } = useAuth();
  const { show } = useToast();
  const [reviewed, setReviewed] = useState(false);
  const [publishing, setPublishing] = useState(false);

  if (loading || !raffle) return <PageSpinner />;

  const readyToPublish = !!prize && !!terms && terms.status === "active";

  async function handlePublish() {
    if (!user || !role) return;
    setPublishing(true);
    try {
      await publishRaffle(raffle!.id, user.uid, role);
      show("success", "Raffle published.");
      refresh();
    } catch (e) {
      show("error", toFriendlyError(e));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-neutral-900">
              {raffle.name}
            </h1>
            <RaffleStatusBadge status={raffle.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {raffle.shortDescription}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <RaffleSubNav raffleId={raffle.id} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Fact
                label="Entry fee"
                value={formatMoney(
                  raffle.payment.entryFee,
                  raffle.payment.currency,
                )}
              />
              <Fact
                label="Registrations"
                value={String(raffle.stats.totalRegistrations)}
              />
              <Fact
                label="Pending payments"
                value={String(raffle.stats.paymentsPending)}
              />
              <Fact
                label="Eligible entries"
                value={String(raffle.stats.eligibleEntries)}
              />
              <Fact
                label="Disqualified entries"
                value={String(raffle.stats.disqualifiedEntries)}
              />
              <Fact
                label="Max participants"
                value={`${raffle.stats.paymentsApproved} / ${raffle.entryConfig.maxParticipants ?? "∞"}`}
              />
              <Fact
                label="Registration window"
                value={`${formatInRaffleTimezone(raffle.schedule.registrationStart, raffle.schedule.timezone, "d MMM")} – ${formatInRaffleTimezone(raffle.schedule.registrationEnd, raffle.schedule.timezone, "d MMM")}`}
              />
              <Fact
                label="Draw date"
                value={formatInRaffleTimezone(
                  raffle.schedule.drawAt,
                  raffle.schedule.timezone,
                  "d MMM yyyy, h:mm a",
                )}
              />
            </CardBody>
          </Card>

          <Card>
            <CardBody className="whitespace-pre-line text-sm text-neutral-600">
              {raffle.fullDescription}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {raffle.status === "DRAFT" && (
            <Card>
              <CardBody className="space-y-3 z-overlay">
                <p className="font-semibold text-neutral-900">
                  Review &amp; publish
                </p>
                <ChecklistItem
                  done={true}
                  label="Basic info, schedule & payment"
                />
                <ChecklistItem
                  done={!!prize}
                  label="Prize configured"
                  hrefIfMissing={`/admin/raffles/${raffle.id}/prizes`}
                />
                <ChecklistItem
                  done={!!terms && terms.status === "active"}
                  label="Terms published"
                  hrefIfMissing={`/admin/raffles/${raffle.id}/terms`}
                />
                {readyToPublish ? (
                  <>
                    <Checkbox
                      label="I have reviewed this raffle and it is ready to be published."
                      checked={reviewed}
                      onChange={(e) => setReviewed(e.target.checked)}
                    />
                    <Button
                      className="w-full"
                      disabled={!reviewed}
                      loading={publishing}
                      onClick={handlePublish}
                    >
                      Publish raffle
                    </Button>
                  </>
                ) : (
                  <Alert tone="info">
                    Complete the checklist above before publishing.
                  </Alert>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function ChecklistItem({
  done,
  label,
  hrefIfMissing,
}: {
  done: boolean;
  label: string;
  hrefIfMissing?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={done ? "text-neutral-700" : "text-neutral-400"}>
        {done ? "✅" : "⬜"} {label}
      </span>
      {!done && hrefIfMissing && (
        <Link
          href={hrefIfMissing}
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          Fix
        </Link>
      )}
    </div>
  );
}
