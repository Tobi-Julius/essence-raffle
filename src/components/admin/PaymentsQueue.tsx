"use client";

import { useEffect, useState } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { Select, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listPaymentsForQueue } from "@/services/payments";
import { getUserProfile } from "@/services/users";
import { getReceiptUrl } from "@/services/storage";
import { reviewPayment } from "@/services/callables";
import { formatDateTime } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyError } from "@/lib/errors";
import type { Payment, PaymentStatus } from "@/types/firestore";

interface Row {
  payment: Payment;
  name: string;
  email: string;
}

const statusOptions: (PaymentStatus | "all")[] = ["all", "verification_pending", "approved", "rejected", "pending"];

export function PaymentsQueue({ raffleId }: { raffleId?: string }) {
  const [status, setStatus] = useState<PaymentStatus | "all">("verification_pending");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<Payment> | null>(null);
  const [history, setHistory] = useState<(QueryDocumentSnapshot<Payment> | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const { show } = useToast();

  useEffect(() => {
    setPageIndex(0);
    setHistory([null]);
  }, [status, raffleId]);

  async function load() {
    setRows(null);
    const page = await listPaymentsForQueue({ raffleId, status, cursor: history[pageIndex] });
    const profiles = await Promise.all(page.payments.map((p) => getUserProfile(p.userId)));
    setRows(page.payments.map((payment, i) => ({ payment, name: profiles[i]?.fullName ?? "—", email: profiles[i]?.email ?? "—" })));
    setCursor(page.cursor);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raffleId, status, pageIndex, history]);

  async function handleView(row: Row) {
    setViewing(row);
    setReceiptUrl(null);
    if (row.payment.receiptPath) {
      const url = await getReceiptUrl(row.payment.receiptPath);
      setReceiptUrl(url);
    }
  }

  async function handleApprove(row: Row) {
    try {
      await reviewPayment({ paymentId: row.payment.id, decision: "approve" });
      show("success", `Payment approved — entry ${row.name} is now confirmed.`);
      load();
      setViewing(null);
    } catch (e) {
      show("error", toFriendlyError(e));
    }
  }

  const filtered = search
    ? (rows ?? []).filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.email.toLowerCase().includes(search.toLowerCase()) ||
          r.payment.reference.toLowerCase().includes(search.toLowerCase()),
      )
    : rows ?? [];

  const columns: Column<Row>[] = [
    { header: "Participant", key: "name", render: (r) => <span>{r.name}</span> },
    { header: "Reference", key: "ref", render: (r) => <span className="font-mono text-xs">{r.payment.reference}</span> },
    { header: "Amount", key: "amount", render: (r) => formatMoney(r.payment.amount, r.payment.currency) },
    { header: "Status", key: "status", render: (r) => <PaymentStatusBadge status={r.payment.status} /> },
    { header: "Submitted", key: "submitted", render: (r) => formatDateTime(r.payment.submittedAt) },
    {
      header: "",
      key: "actions",
      className: "text-right",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => handleView(r)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus | "all")}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-64">
          <Input label="Search" placeholder="Name, email, or reference" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.payment.id} loading={rows === null} emptyTitle="No payments match this filter" />
      </div>

      {!search && (
        <Pagination
          hasPrevious={pageIndex > 0}
          hasNext={!!cursor}
          onPrevious={() => setPageIndex((i) => Math.max(0, i - 1))}
          onNext={() => {
            if (!cursor) return;
            setHistory((h) => [...h.slice(0, pageIndex + 1), cursor]);
            setPageIndex((i) => i + 1);
          }}
        />
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Review payment"
        description={viewing ? `${viewing.name} · ${formatMoney(viewing.payment.amount, viewing.payment.currency)}` : undefined}
        size="lg"
        footer={
          viewing?.payment.status === "verification_pending" ? (
            <>
              <Button variant="danger" onClick={() => setRejecting(viewing)}>
                Reject
              </Button>
              <Button onClick={() => viewing && handleApprove(viewing)}>Approve</Button>
            </>
          ) : undefined
        }
      >
        {viewing && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Reference" value={viewing.payment.reference} />
              <Field label="Email" value={viewing.email} />
              <Field label="Amount" value={formatMoney(viewing.payment.amount, viewing.payment.currency)} />
              <Field label="Submitted" value={formatDateTime(viewing.payment.submittedAt)} />
            </dl>
            {viewing.payment.rejectionReason && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Rejected: {viewing.payment.rejectionReason}</p>
            )}
            {viewing.payment.receiptPath ? (
              receiptUrl ? (
                receiptUrl.includes(".pdf") ? (
                  <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-700 hover:underline">
                    Open PDF receipt
                  </a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- external Firebase Storage URL, next/image domain config not needed for admin preview
                  <img src={receiptUrl} alt="Payment receipt" className="max-h-[50vh] w-full rounded-xl border border-neutral-200 object-contain" />
                )
              ) : (
                <p className="text-sm text-neutral-400">Loading receipt…</p>
              )
            ) : (
              <p className="text-sm text-neutral-400">No receipt uploaded yet.</p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject this payment?"
        description="The participant will see this reason and can upload a new receipt."
        confirmLabel="Reject payment"
        danger
        requireReason
        reasonLabel="Rejection reason"
        onConfirm={async (reason) => {
          if (!rejecting) return;
          await reviewPayment({ paymentId: rejecting.payment.id, decision: "reject", rejectionReason: reason });
          show("success", "Payment rejected.");
          setViewing(null);
          load();
        }}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium text-neutral-800">{value}</dd>
    </div>
  );
}
