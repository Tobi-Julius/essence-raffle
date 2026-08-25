"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, PlayCircle } from "lucide-react";
import { RaffleSubNav } from "@/components/admin/RaffleSubNav";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAdminRaffle } from "@/hooks/useAdminRaffle";
import { countEligibleEntries } from "@/services/entries";
import { advanceDrawPresentation, runDraw, watchLatestDraw } from "@/services/draws";
import { watchActiveWinner } from "@/services/winners";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyError } from "@/lib/errors";
import { formatDateTime } from "@/lib/utils/dates";
import type { DrawPresentationState, Draw, Winner } from "@/types/firestore";

const presentationFlow: DrawPresentationState[] = ["READY", "DRAWING", "REVEALING", "WINNER_REVEALED", "COMPLETED"];

export default function AdminDrawPage() {
  const params = useParams<{ raffleId: string }>();
  const { raffle, loading } = useAdminRaffle(params.raffleId);
  const { user, role } = useAuth();
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    countEligibleEntries(params.raffleId).then(setEligibleCount);
    const unsubDraw = watchLatestDraw(params.raffleId, setDraw);
    const unsubWinner = watchActiveWinner(params.raffleId, setWinner);
    return () => {
      unsubDraw();
      unsubWinner();
    };
  }, [params.raffleId]);

  if (loading || !raffle) return <PageSpinner />;

  const canStart = raffle.status === "DRAWING" && !draw;
  const nextState = draw ? presentationFlow[presentationFlow.indexOf(draw.presentationState) + 1] : null;

  async function handleStart() {
    if (!user || !role) return;
    try {
      await runDraw(raffle!.id, user.uid, role);
      show("success", "Draw complete — a winner was selected.");
    } catch (e) {
      show("error", toFriendlyError(e));
    }
  }

  async function handleAdvance() {
    if (!nextState || !draw) return;
    setAdvancing(true);
    try {
      await advanceDrawPresentation(draw.id, nextState);
    } catch (e) {
      show("error", toFriendlyError(e));
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{raffle.name}</h1>
      <div className="mt-6">
        <RaffleSubNav raffleId={raffle.id} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-neutral-900">Draw status</p>
                {draw && <Badge tone={draw.status === "completed" ? "success" : draw.status === "failed" ? "error" : "warning"}>{draw.status}</Badge>}
              </div>

              {raffle.status !== "DRAWING" && !draw && (
                <Alert tone="info">
                  The draw becomes available once registration closes and the raffle enters the Drawing state.
                  {raffle.status === "OPEN" && " Registration is still open."}
                </Alert>
              )}

              {eligibleCount !== null && (
                <p className="text-sm text-neutral-600">
                  <strong>{eligibleCount}</strong> eligible entr{eligibleCount === 1 ? "y" : "ies"} in the draw pool.
                </p>
              )}

              {canStart && (
                <Button onClick={() => setConfirmOpen(true)} disabled={eligibleCount === 0}>
                  <PlayCircle className="h-4 w-4" /> Start secure draw
                </Button>
              )}
              {eligibleCount === 0 && canStart && <Alert tone="warning">No eligible entries — the draw cannot start.</Alert>}

              {draw && (
                <div className="space-y-2 border-t border-neutral-100 pt-4 text-sm">
                  <p>
                    Started {formatDateTime(draw.startedAt)} by an admin · randomization {draw.randomizationVersion}
                  </p>
                  <p>
                    Presentation state: <strong>{draw.presentationState}</strong>
                  </p>
                  {nextState && (
                    <Button size="sm" variant="outline" onClick={handleAdvance} loading={advancing}>
                      Advance to {nextState}
                    </Button>
                  )}
                </div>
              )}

              {winner && (
                <Alert tone="success" title="Winner selected">
                  Entry {winner.entryNumber}
                </Alert>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardBody className="space-y-3">
            <p className="font-semibold text-neutral-900">Public draw screen</p>
            <p className="text-sm text-neutral-500">
              Open this on a projector or TV. It updates automatically as you control the draw here — no admin controls
              are shown on that screen.
            </p>
            <Link href={`/draw/${raffle.id}`} target="_blank">
              <Button variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4" /> Open public draw screen
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Start the draw?"
        description="A winner is selected at random from the current eligible entry pool. This cannot be undone once started."
        confirmLabel="Start draw"
        onConfirm={handleStart}
      />
    </div>
  );
}
