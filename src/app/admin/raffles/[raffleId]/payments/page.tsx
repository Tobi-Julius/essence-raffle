"use client";

import { useParams } from "next/navigation";
import { RaffleSubNav } from "@/components/admin/RaffleSubNav";
import { PaymentsQueue } from "@/components/admin/PaymentsQueue";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAdminRaffle } from "@/hooks/useAdminRaffle";

export default function AdminRafflePaymentsPage() {
  const params = useParams<{ raffleId: string }>();
  const { raffle, loading } = useAdminRaffle(params.raffleId);

  if (loading || !raffle) return <PageSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{raffle.name}</h1>
      <div className="mt-6">
        <RaffleSubNav raffleId={raffle.id} />
      </div>
      <div className="mt-6">
        <PaymentsQueue raffleId={raffle.id} />
      </div>
    </div>
  );
}
