"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/Card";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardBody } from "@/components/ui/Card";
import { listAllRafflesForAdmin } from "@/services/raffles";
import { listAuditLogs } from "@/services/auditLogs";
import { formatDateTime, relativeTimeFrom } from "@/lib/utils/dates";
import type { AuditLog, Raffle } from "@/types/firestore";
import { AUDIT_ACTION_LABELS } from "@/lib/auditLabels";

export default function AdminOverviewPage() {
  const [raffles, setRaffles] = useState<Raffle[] | null>(null);
  const [logs, setLogs] = useState<AuditLog[] | null>(null);

  useEffect(() => {
    listAllRafflesForAdmin().then(setRaffles);
    listAuditLogs({ pageSize: 15 }).then((p) => setLogs(p.logs));
  }, []);

  const stats = raffles
    ? {
        total: raffles.length,
        active: raffles.filter((r) => r.status === "OPEN" || r.status === "DRAWING").length,
        upcoming: raffles.filter((r) => r.status === "UPCOMING").length,
        completed: raffles.filter((r) => r.status === "COMPLETED").length,
        pendingPayments: raffles.reduce((sum, r) => sum + r.stats.paymentsPending, 0),
        eligible: raffles.reduce((sum, r) => sum + r.stats.eligibleEntries, 0),
        winners: raffles.filter((r) => r.hasWinner).length,
      }
    : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Overview</h1>
          <p className="mt-1 text-sm text-neutral-500">A snapshot of every raffle on the platform.</p>
        </div>
        <Link href="/admin/raffles/create" className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 max-sm:text-xs max-sm:w-30">
          + New raffle
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats ? (
          <>
            <StatCard label="Total raffles" value={stats.total} />
            <StatCard label="Active raffles" value={stats.active} />
            <StatCard label="Upcoming raffles" value={stats.upcoming} />
            <StatCard label="Completed raffles" value={stats.completed} />
            <StatCard label="Pending payments" value={stats.pendingPayments} />
            <StatCard label="Eligible participants" value={stats.eligible} />
            <StatCard label="Raffles with a winner" value={stats.winners} />
          </>
        ) : (
          Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900">Recent activity</h2>
        <Card className="mt-3">
          <CardBody className="p-0">
            {logs === null ? (
              <div className="p-5">
                <StatCardSkeleton />
              </div>
            ) : logs.length === 0 ? (
              <EmptyState title="No activity yet" description="Sensitive actions will be logged here as they happen." />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="text-neutral-700">{AUDIT_ACTION_LABELS[log.action] ?? log.action}</span>
                    <span title={formatDateTime(log.timestamp)} className="shrink-0 text-xs text-neutral-400">
                      {relativeTimeFrom(log.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
