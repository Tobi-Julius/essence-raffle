"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { PaymentTimeline } from "@/components/payment/PaymentTimeline";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/utils/money";
import { whatsappLink } from "@/lib/utils/whatsapp";
import type { Payment, Raffle } from "@/types/firestore";

export function PaymentCard({ payment, raffle }: { payment: Payment; raffle: Raffle }) {
  const [copied, setCopied] = useState(false);
  function copyReference() {
    navigator.clipboard.writeText(payment.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const [accountNumberCopied, setAccountNumberCopied] = useState(false);
  function copyAccountNumber() {
    navigator.clipboard.writeText(raffle.payment.accountNumber);
    setAccountNumberCopied(true);
    setTimeout(() => setAccountNumberCopied(false), 1500);
  }

  const showBankDetails = payment.status === "pending" || payment.status === "rejected";
  const proofLink = whatsappLink(`Payment proof for reference ${payment.reference}`);

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-neutral-900">Payment</p>
          <PaymentStatusBadge status={payment.status} />
        </div>

        <PaymentTimeline paymentStatus={payment.status} />

        {payment.status === "rejected" && payment.rejectionReason && (
          <Alert tone="error" title="Payment could not be verified">
            {payment.rejectionReason}
          </Alert>
        )}

        {payment.status === "approved" && (
          <Alert tone="success" title="You're officially entered">
            Your payment was approved and your entry is confirmed.
          </Alert>
        )}

        {showBankDetails && (
          <div className="rounded-xl border border-neutral-200 p-4 text-sm">
            <p className="mb-3 font-medium text-neutral-800">Bank transfer details</p>
            <dl className="space-y-1.5">
              <Row label="Bank" value={raffle.payment.bankName} />
              <Row label="Account name" value={raffle.payment.accountName} />
              <div className="flex items-center justify-between gap-2 py-0.5">
                <dt className="text-neutral-500">Account number</dt>
                <dd className="flex items-center gap-1.5 font-medium text-neutral-900">
                  {raffle.payment.accountNumber}
                  <button
                    onClick={copyAccountNumber}
                    aria-label="Copy account number"
                    className="focus-ring rounded p-1 text-neutral-400 hover:text-neutral-700"
                  >
                    {accountNumberCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </dd>
              </div>
              <Row label="Amount" value={formatMoney(payment.amount, payment.currency)} />
              <div className="flex items-center justify-between gap-2 py-0.5">
                <dt className="text-neutral-500">Payment reference</dt>
                <dd className="flex items-center gap-1.5 font-mono font-medium text-neutral-900">
                  {payment.reference}
                  <button onClick={copyReference} aria-label="Copy reference" className="focus-ring rounded p-1 text-neutral-400 hover:text-neutral-700">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </dd>
              </div>
            </dl>
            {raffle.payment.instructions && <p className="mt-3 text-xs text-neutral-500">{raffle.payment.instructions}</p>}
          </div>
        )}

        {showBankDetails && (
          <div className="rounded-xl border border-neutral-200 p-4 text-sm">
            <p className="mb-1 font-medium text-neutral-800">Send your payment proof</p>
            <p className="mb-3 text-neutral-500">
              After transferring, send a screenshot of your receipt to our WhatsApp with your payment
              reference — our team verifies it there and approves your entry.
            </p>
            {proofLink ? (
              <a
                href={proofLink}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 active:bg-brand-800"
              >
                Send proof on WhatsApp
              </a>
            ) : (
              <p className="text-neutral-400">WhatsApp support isn&apos;t configured yet.</p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-900">{value}</dd>
    </div>
  );
}
