"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RaffleSubNav } from "@/components/admin/RaffleSubNav";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { WinnerStatusBadge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Textarea } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAdminRaffle } from "@/hooks/useAdminRaffle";
import { listWinnerHistory, disqualifyWinner, redraw } from "@/services/winners";
import { getUserProfile } from "@/services/users";
import { claimPrize } from "@/services/prizes";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/utils/dates";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyError } from "@/lib/errors";
import type { UserProfile, Winner } from "@/types/firestore";
import { Trophy } from "lucide-react";

interface WinnerRow {
  winner: Winner;
  profile: UserProfile | null;
}

export default function AdminWinnersPage() {
  const params = useParams<{ raffleId: string }>();
  const { raffle, prize, loading, refresh } = useAdminRaffle(params.raffleId);
  const { user, role } = useAuth();
  const [rows, setRows] = useState<WinnerRow[] | null>(null);
  const [disqualifyTarget, setDisqualifyTarget] = useState<Winner | null>(null);
  const [redrawing, setRedrawing] = useState(false);
  const [claimForm, setClaimForm] = useState({ deliveryMethod: "", claimNotes: "" });
  const [claiming, setClaiming] = useState(false);
  const { show } = useToast();

  async function load() {
    const list = await listWinnerHistory(params.raffleId);
    const profiles = await Promise.all(list.map((w) => getUserProfile(w.userId)));
    setRows(list.map((winner, i) => ({ winner, profile: profiles[i] })));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.raffleId]);

  if (loading || !raffle) return <PageSpinner />;

  const activeWinner = rows?.find((r) => r.winner.isActive);

  async function handleRedraw() {
    if (!user || !role) return;
    setRedrawing(true);
    try {
      const result = await redraw(raffle!.id, user.uid, role);
      if (result.winnerId) {
        show("success", "Redraw complete — a new winner was selected.");
      } else {
        show("warning", "No remaining eligible entries for a redraw.");
      }
      load();
      refresh();
    } catch (e) {
      show("error", toFriendlyError(e));
    } finally {
      setRedrawing(false);
    }
  }

  async function handleClaim() {
    if (!user || !role) return;
    setClaiming(true);
    try {
      await claimPrize(
        raffle!.id,
        { deliveryMethod: claimForm.deliveryMethod || undefined, claimNotes: claimForm.claimNotes || undefined },
        user.uid,
        role,
      );
      show("success", "Prize marked as claimed.");
      refresh();
    } catch (e) {
      show("error", toFriendlyError(e));
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{raffle.name}</h1>
      <div className="mt-6">
        <RaffleSubNav raffleId={raffle.id} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {rows === null ? (
            <PageSpinner />
          ) : rows.length === 0 ? (
            <EmptyState icon={Trophy} title="No winner yet" description="Run the draw to select a winner for this raffle." />
          ) : (
            rows.map(({ winner, profile }) => (
              <Card key={winner.id} className={winner.isActive ? "border-brand-300" : undefined}>
                <CardBody className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm font-medium text-neutral-800">{winner.entryNumber}</p>
                    <WinnerStatusBadge status={winner.status} />
                  </div>
                  <p className="text-sm text-neutral-600">{profile?.fullName ?? "—"}</p>
                  <p className="text-xs text-neutral-400">
                    {winner.isRedraw ? "Selected via redraw · " : ""}
                    {formatDateTime(winner.createdAt)}
                  </p>
                  {winner.status === "disqualified" && (
                    <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
                      Disqualified: {winner.disqualificationReason}
                    </p>
                  )}
                  {winner.isActive && winner.status !== "disqualified" && (
                    <Button size="sm" variant="danger" onClick={() => setDisqualifyTarget(winner)}>
                      Disqualify
                    </Button>
                  )}
                </CardBody>
              </Card>
            ))
          )}

          {rows && rows.length > 0 && !activeWinner && (
            <Alert tone="warning" title="No active winner">
              <div className="mt-2">
                <Button size="sm" onClick={handleRedraw} loading={redrawing}>
                  Run redraw
                </Button>
              </div>
            </Alert>
          )}
        </div>

        <Card>
          <CardBody className="space-y-4">
            <p className="font-semibold text-neutral-900">Prize claim</p>
            {!prize ? (
              <p className="text-sm text-neutral-400">No prize configured.</p>
            ) : prize.status === "claimed" ? (
              <Alert tone="success" title="Prize claimed">
                Claimed {formatDateTime(prize.claimedAt)}
              </Alert>
            ) : !activeWinner ? (
              <p className="text-sm text-neutral-400">A prize can be claimed once there is an active winner.</p>
            ) : (
              <>
                <Input
                  label="Delivery method"
                  placeholder="e.g. In-store pickup"
                  value={claimForm.deliveryMethod}
                  onChange={(e) => setClaimForm((f) => ({ ...f, deliveryMethod: e.target.value }))}
                />
                <Textarea
                  label="Notes"
                  rows={3}
                  value={claimForm.claimNotes}
                  onChange={(e) => setClaimForm((f) => ({ ...f, claimNotes: e.target.value }))}
                />
                <Button className="w-full" onClick={handleClaim} loading={claiming}>
                  Mark prize as claimed
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={!!disqualifyTarget}
        onClose={() => setDisqualifyTarget(null)}
        title="Disqualify this winner?"
        description="The original winner record is kept for audit purposes. You can run a redraw afterward."
        confirmLabel="Disqualify"
        danger
        requireReason
        onConfirm={async (reason) => {
          if (!disqualifyTarget || !user || !role) return;
          await disqualifyWinner(disqualifyTarget.id, reason ?? "", user.uid, role);
          show("success", "Winner disqualified.");
          load();
          refresh();
        }}
      />
    </div>
  );
}
