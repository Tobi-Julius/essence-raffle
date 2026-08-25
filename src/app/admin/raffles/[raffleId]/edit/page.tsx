"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { RaffleSubNav } from "@/components/admin/RaffleSubNav";
import { RaffleForm, type RaffleFormValues } from "@/components/admin/RaffleForm";
import { PageSpinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAdminRaffle } from "@/hooks/useAdminRaffle";
import { updateDraftRaffle, updateRaffleMedia } from "@/services/raffles";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyError } from "@/lib/errors";
import { toDate } from "@/lib/utils/dates";

function toLocalInput(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditRafflePage() {
  const params = useParams<{ raffleId: string }>();
  const router = useRouter();
  const { raffle, loading, refresh } = useAdminRaffle(params.raffleId);
  const { show } = useToast();
  const [bannerUrl, setBannerUrl] = useState("");
  const [savingBanner, setSavingBanner] = useState(false);

  if (loading) return <PageSpinner />;
  if (!raffle) return <Alert tone="error">Raffle not found.</Alert>;

  async function handleBanner() {
    if (!bannerUrl.trim()) return;
    setSavingBanner(true);
    try {
      await updateRaffleMedia(raffle!.id, { bannerUrl: bannerUrl.trim() });
      show("success", "Banner updated.");
      setBannerUrl("");
      refresh();
    } catch (e) {
      show("error", toFriendlyError(e));
    } finally {
      setSavingBanner(false);
    }
  }

  const editable = raffle.status === "DRAFT" || raffle.status === "UPCOMING";

  const initial: RaffleFormValues = {
    name: raffle.name,
    shortDescription: raffle.shortDescription,
    fullDescription: raffle.fullDescription,
    timezone: raffle.schedule.timezone,
    registrationStart: toLocalInput(toDate(raffle.schedule.registrationStart)),
    registrationEnd: toLocalInput(toDate(raffle.schedule.registrationEnd)),
    drawAt: toLocalInput(toDate(raffle.schedule.drawAt)),
    entryFee: String(raffle.payment.entryFee),
    currency: raffle.payment.currency,
    bankName: raffle.payment.bankName,
    accountName: raffle.payment.accountName,
    accountNumber: raffle.payment.accountNumber,
    instructions: raffle.payment.instructions,
    eligibilityType: raffle.eligibility.type,
    eligibilityGroupLabel: raffle.eligibility.groupLabel ?? "",
    eligibilityDescription: raffle.eligibility.description,
    allowMultipleEntries: raffle.entryConfig.allowMultipleEntries,
    maxEntriesPerUser: String(raffle.entryConfig.maxEntriesPerUser),
    maxParticipants: raffle.entryConfig.maxParticipants ? String(raffle.entryConfig.maxParticipants) : "",
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{raffle.name}</h1>
      <div className="mt-6">
        <RaffleSubNav raffleId={raffle.id} />
      </div>
      <div className="mt-6 max-w-3xl space-y-6">
        <div className="rounded-2xl border border-neutral-200 p-5">
          <h2 className="font-semibold text-neutral-900">Banner image</h2>
          <p className="mt-1 text-sm text-neutral-500">Shown on the raffle card and details page.</p>
          <div className="mt-3">
            {raffle.bannerUrl && (
              <div className="relative mb-3 h-40 w-full overflow-hidden rounded-xl">
                <Image src={raffle.bannerUrl} alt="" fill className="object-cover" />
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Banner image URL"
                  placeholder="https://…"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                />
              </div>
              <Button onClick={handleBanner} loading={savingBanner} disabled={!bannerUrl.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
        {!editable && (
          <div className="mb-6">
            <Alert tone="warning" title="This raffle can no longer be edited">
              Raffles can only be edited while in Draft or Upcoming status.
            </Alert>
          </div>
        )}
        <RaffleForm
          initial={initial}
          disabled={!editable}
          submitLabel="Save changes"
          onSubmit={async (input) => {
            await updateDraftRaffle(raffle.id, input);
            show("success", "Raffle updated.");
            refresh();
            router.push(`/admin/raffles/${raffle.id}`);
          }}
        />
      </div>
    </div>
  );
}
