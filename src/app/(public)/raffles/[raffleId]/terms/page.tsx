"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card, CardBody } from "@/components/ui/Card";
import { SanitizedHtml } from "@/components/ui/SanitizedHtml";
import { Checkbox } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useRaffleBundle } from "@/hooks/useRaffleBundle";
import { useAuth } from "@/hooks/useAuth";
import { registerForRaffle } from "@/services/registration";
import { toFriendlyError } from "@/lib/errors";
import { useToast } from "@/components/ui/Toast";

export default function RaffleTermsPage() {
  const params = useParams<{ raffleId: string }>();
  const router = useRouter();
  const { raffle, terms, loading, notFound } = useRaffleBundle(params.raffleId);
  const { user, loading: authLoading } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();

  if (loading || authLoading) return <PageSpinner />;

  if (!user) {
    router.replace(`/login?redirect=/raffles/${params.raffleId}/terms`);
    return <PageSpinner />;
  }

  if (notFound || !raffle) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Alert tone="error" title="Raffle not found">This raffle doesn&apos;t exist.</Alert>
      </div>
    );
  }

  if (!terms) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Alert tone="warning" title="Terms not yet available">This raffle isn&apos;t open for entries yet.</Alert>
      </div>
    );
  }

  if (raffle.status !== "OPEN") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Alert tone="warning" title="Registration isn't open">
          This raffle is not currently accepting entries.
        </Alert>
        <Link href={`/raffles/${raffle.id}`} className="mt-4 inline-block text-sm text-brand-700 hover:underline">
          Back to raffle
        </Link>
      </div>
    );
  }

  async function handleSubmit() {
    if (!accepted) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await registerForRaffle(
        {
          raffleId: raffle!.id,
          termsId: terms!.id,
          termsVersion: terms!.version,
          termsAccepted: true,
        },
        user!.uid,
      );
      show("success", "You're registered! Complete your payment to secure your entry.");
      router.push(`/dashboard/raffles/${raffle!.id}?paymentId=${result.paymentId}`);
    } catch (e) {
      setError(toFriendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href={`/raffles/${raffle.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800">
        <ArrowLeft className="h-4 w-4" /> Back to raffle
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-900">Terms &amp; Conditions</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {raffle.name} · Version {terms.version}
      </p>

      <Card className="mt-6">
        <CardBody className="max-h-[50vh] overflow-y-auto">
          <SanitizedHtml html={terms.contentHtml} />
        </CardBody>
      </Card>

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-neutral-200 p-5">
        <Checkbox
          label="I have read and agree to the Terms & Conditions."
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <Button className="mt-4 w-full sm:w-auto" disabled={!accepted} loading={submitting} onClick={handleSubmit}>
          Accept &amp; Continue to Payment
        </Button>
      </div>
    </div>
  );
}
