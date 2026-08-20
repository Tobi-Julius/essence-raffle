"use client";

import Papa from "papaparse";

/** Client-side CSV generation from an already-fetched, paginated result set. */
export function downloadCsv<T extends Record<string, unknown>>(rows: T[], filename: string): void {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
