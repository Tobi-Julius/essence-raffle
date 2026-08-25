"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { RaffleSubNav } from "@/components/admin/RaffleSubNav";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EntryStatusBadge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAdminRaffle } from "@/hooks/useAdminRaffle";
import { listEntriesForRaffle } from "@/services/entries";
import { getUserProfile } from "@/services/users";
import { downloadCsv } from "@/lib/utils/csv";
import { formatDateTime } from "@/lib/utils/dates";
import type { EntryStatus, RaffleEntry } from "@/types/firestore";
import type { QueryDocumentSnapshot } from "firebase/firestore";

interface Row {
  entry: RaffleEntry;
  name: string;
  email: string;
}

const statusOptions: (EntryStatus | "all")[] = [
  "all",
  "payment_pending",
  "eligible",
  "rejected",
  "disqualified",
  "winner",
  "cancelled",
];

export default function AdminParticipantsPage() {
  const params = useParams<{ raffleId: string }>();
  const { raffle, loading: raffleLoading } = useAdminRaffle(params.raffleId);
  const [status, setStatus] = useState<EntryStatus | "all">("all");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<RaffleEntry> | null>(null);
  const [history, setHistory] = useState<(QueryDocumentSnapshot<RaffleEntry> | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
    setHistory([null]);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    listEntriesForRaffle(params.raffleId, {
      status: status === "all" ? undefined : status,
      cursor: history[pageIndex],
    }).then(async (page) => {
      if (cancelled) return;
      const profiles = await Promise.all(page.entries.map((e) => getUserProfile(e.userId)));
      setRows(page.entries.map((entry, i) => ({ entry, name: profiles[i]?.fullName ?? "—", email: profiles[i]?.email ?? "—" })));
      setCursor(page.cursor);
    });
    return () => {
      cancelled = true;
    };
  }, [params.raffleId, status, pageIndex, history]);

  if (raffleLoading || !raffle) return <PageSpinner />;

  const columns: Column<Row>[] = [
    { header: "Entry #", key: "num", render: (r) => <span className="font-mono text-xs">{r.entry.entryNumber}</span> },
    { header: "Participant", key: "name", render: (r) => r.name },
    { header: "Email", key: "email", render: (r) => r.email },
    { header: "Status", key: "status", render: (r) => <EntryStatusBadge status={r.entry.status} /> },
    { header: "Joined", key: "joined", render: (r) => formatDateTime(r.entry.joinedAt) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{raffle.name}</h1>
      <div className="mt-6">
        <RaffleSubNav raffleId={raffle.id} />
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div className="w-48">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as EntryStatus | "all")}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            rows &&
            downloadCsv(
              rows.map((r) => ({
                entryNumber: r.entry.entryNumber,
                name: r.name,
                email: r.email,
                status: r.entry.status,
                joinedAt: formatDateTime(r.entry.joinedAt),
              })),
              `${raffle.slug}-participants.csv`,
            )
          }
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="mt-4">
        <DataTable columns={columns} rows={rows ?? []} rowKey={(r) => r.entry.id} loading={rows === null} emptyTitle="No participants match this filter" />
      </div>

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
    </div>
  );
}
