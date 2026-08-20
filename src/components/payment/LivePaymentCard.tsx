"use client";

import { useEffect, useState } from "react";
import { watchPayment } from "@/services/payments";
import { PaymentCard } from "@/components/payment/PaymentCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Payment, Raffle } from "@/types/firestore";

/** Subscribes to live payment status so an admin approval/rejection reflects
 * on the participant's screen without a manual refresh. */
export function LivePaymentCard({
  paymentId,
  raffle,
  userId,
}: {
  paymentId: string;
  raffle: Raffle;
  userId: string;
}) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    return watchPayment(paymentId, (next) => {
      setPayment(next);
      setLoaded(true);
    });
  }, [paymentId]);

  if (!loaded) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!payment) return <EmptyState title="Payment details unavailable" description="This payment couldn't be loaded." />;
  return <PaymentCard payment={payment} raffle={raffle} userId={userId} />;
}
