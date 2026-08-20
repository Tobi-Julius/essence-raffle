import type { ReactNode } from "react";
import { RequireAdmin } from "@/components/auth/RouteGuard";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <AdminShell>{children}</AdminShell>
    </RequireAdmin>
  );
}
