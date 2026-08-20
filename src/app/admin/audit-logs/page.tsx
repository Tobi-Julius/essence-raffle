"use client";

import { useEffect, useState } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { Download } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { listAuditLogs } from "@/services/auditLogs";
import { AUDIT_ACTION_LABELS } from "@/lib/auditLabels";
import { AUDIT_ACTIONS, type AuditAction, type AuditLog } from "@/types/firestore";
import { formatDateTime } from "@/lib/utils/dates";
import { downloadCsv } from "@/lib/utils/csv";

export default function AuditLogsPage() {
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<AuditLog> | null>(null);
  const [history, setHistory] = useState<(QueryDocumentSnapshot<AuditLog> | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
    setHistory([null]);
  }, [action]);

  useEffect(() => {
    listAuditLogs({ action: action === "all" ? undefined : action, cursor: history[pageIndex] }).then((page) => {
      setLogs(page.logs);
      setCursor(page.cursor);
    });
  }, [action, pageIndex, history]);

  const columns: Column<AuditLog>[] = [
    { header: "Action", key: "action", render: (l) => AUDIT_ACTION_LABELS[l.action] ?? l.action },
    { header: "Actor role", key: "role", render: (l) => l.actorRole },
    { header: "Raffle", key: "raffle", render: (l) => l.raffleId ?? "—" },
    { header: "Target", key: "target", render: (l) => l.targetId ?? "—" },
    { header: "Timestamp", key: "ts", render: (l) => formatDateTime(l.timestamp) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Audit logs</h1>
          <p className="mt-1 text-sm text-neutral-500">An append-only record of every sensitive action on the platform.</p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            logs &&
            downloadCsv(
              logs.map((l) => ({
                action: l.action,
                actorId: l.actorId,
                actorRole: l.actorRole,
                raffleId: l.raffleId ?? "",
                targetId: l.targetId ?? "",
                timestamp: formatDateTime(l.timestamp),
              })),
              "audit-logs.csv",
            )
          }
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="mt-6 w-64">
        <Select label="Action" value={action} onChange={(e) => setAction(e.target.value as AuditAction | "all")}>
          <option value="all">All actions</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {AUDIT_ACTION_LABELS[a]}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        <DataTable columns={columns} rows={logs ?? []} rowKey={(l) => l.id} loading={logs === null} emptyTitle="No audit activity yet" />
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
