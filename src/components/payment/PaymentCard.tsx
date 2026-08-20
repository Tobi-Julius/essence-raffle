"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { FileUpload } from "@/components/ui/FileUpload";
import { PaymentTimeline } from "@/components/payment/PaymentTimeline";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/utils/money";
import { toFriendlyError } from "@/lib/errors";
import { uploadReceipt } from "@/services/storage";
import { submitReceipt } from "@/services/callables";
import { FileValidationError } from "@/services/storage";
import type { Payment, Raffle } from "@/types/firestore";
import { useToast } from "@/components/ui/Toast";

export function PaymentCard({ payment, raffle, userId }: { payment: Payment; raffle: Raffle; userId: string }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();

  async function handleFileSelect(file: File) {
    setError(null);
    try {
      setFileName(file.name);
      setUploading(true);
      const { done } = uploadReceipt(raffle.id, userId, payment.id, file, setProgress);
      const path = await done;
      await submitReceipt({ paymentId: payment.id, receiptPath: path, mimeType: file.type as never, sizeBytes: file.size });
      show("success", "Receipt submitted for verification.");
    } catch (e) {
      if (e instanceof FileValidationError) {
        setError(e.message);
      } else {
        setError(toFriendlyError(e));
      }
      setFileName(null);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  const [copied, setCopied] = useState(false);
  function copyReference() {
    navigator.clipboard.writeText(payment.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const showBankDetails = payment.status === "pending" || payment.status === "rejected";

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-neutral-900">Payment</p>
          <PaymentStatusBadge status={payment.status} />
        </div>

        <PaymentTimeline paymentStatus={payment.status} hasReceipt={!!payment.receiptPath} />

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

        {payment.status === "verification_pending" && (
          <Alert tone="warning" title="Payment verification pending">
            Our team is reviewing your receipt. This usually takes a short while.
          </Alert>
        )}

        {showBankDetails && (
          <div className="rounded-xl border border-neutral-200 p-4 text-sm">
            <p className="mb-3 font-medium text-neutral-800">Bank transfer details</p>
            <dl className="space-y-1.5">
              <Row label="Bank" value={raffle.payment.bankName} />
              <Row label="Account name" value={raffle.payment.accountName} />
              <Row label="Account number" value={raffle.payment.accountNumber} />
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
          <FileUpload
            label="Upload payment receipt"
            hint="JPG, PNG, or PDF — up to 8MB"
            accept="image/jpeg,image/png,application/pdf"
            onSelect={handleFileSelect}
            error={error ?? undefined}
            progress={uploading ? progress ?? 0 : null}
            selectedFileName={fileName}
            onRemove={() => setFileName(null)}
            disabled={uploading}
          />
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
