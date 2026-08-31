"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { RaffleStatusBadge } from "@/components/ui/Badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listAllRafflesForAdmin, publishRaffle, cancelRaffle } from "@/services/raffles";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyError } from "@/lib/errors";
import type { Raffle } from "@/types/firestore";

export default function AdminRafflesPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [raffles, setRaffles] = useState<Raffle[] | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Raffle | null>(null);
  const { show } = useToast();

  async function refresh() {
    setRaffles(await listAllRafflesForAdmin());
  }

  useEffect(() => {
    refresh();
  }, []);

  const columns: Column<Raffle>[] = [
    {
      header: "Name",
      key: "name",
      render: (r) => (
        <Link href={`/admin/raffles/${r.id}`} className="font-medium text-neutral-900 hover:text-brand-700">
          {r.name}
        </Link>
      ),
    },
    { header: "Status", key: "status", render: (r) => <RaffleStatusBadge status={r.status} /> },
    { header: "Entry fee", key: "fee", render: (r) => formatMoney(r.payment.entryFee, r.payment.currency) },
    { header: "Registrations", key: "reg", render: (r) => r.stats.totalRegistrations },
    { header: "Pending payments", key: "pending", render: (r) => r.stats.paymentsPending },
    { header: "Draw date", key: "draw", render: (r) => formatDateTime(r.schedule.drawAt) },
    {
      header: "",
      key: "actions",
      className: "text-right",
      render: (r) => (
        <Dropdown
          actions={[
            { label: "View", onClick: () => router.push(`/admin/raffles/${r.id}`) },
            { label: "Edit", onClick: () => router.push(`/admin/raffles/${r.id}/edit`), disabled: r.status !== "DRAFT" && r.status !== "UPCOMING" },
            {
              label: "Publish",
              onClick: async () => {
                if (!user || !role) return;
                try {
                  await publishRaffle(r.id, user.uid, role);
                  show("success", "Raffle published.");
                  refresh();
                } catch (e) {
                  show("error", toFriendlyError(e));
                }
              },
              disabled: r.status !== "DRAFT",
            },
            {
              label: "Cancel raffle",
              danger: true,
              onClick: () => setCancelTarget(r),
              disabled: r.status === "COMPLETED" || r.status === "CANCELLED",
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="max-sm:max-w-88">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Raffles</h1>
          <p className="mt-1 text-sm text-neutral-500">Create and manage every raffle on the platform.</p>
        </div>
        <Link href="/admin/raffles/create">
          <Button className="max-sm:text-xs max-sm:w-27">+ New raffle</Button>
        </Link>
      </div>

      <div className="mt-6 max-w-full max-sm:block">
        <DataTable
          columns={columns}
          rows={raffles ?? []}
          rowKey={(r) => r.id}
          loading={raffles === null}
          emptyTitle="No raffles yet"
          emptyDescription="Create your first raffle to get started."
        />
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={`Cancel "${cancelTarget?.name}"?`}
        description="Cancelled raffles stop accepting entries and cannot be drawn. This cannot be undone."
        confirmLabel="Cancel raffle"
        danger
        requireReason
        reasonLabel="Reason for cancellation"
        onConfirm={async (reason) => {
          if (!cancelTarget || !user || !role) return;
          await cancelRaffle(cancelTarget.id, reason ?? "", user.uid, role);
          show("success", "Raffle cancelled.");
          refresh();
        }}
      />
    </div>
  );
}
