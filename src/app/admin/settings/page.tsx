"use client";

import { RequireSuperAdmin } from "@/components/auth/RouteGuard";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

export default function AdminSettingsPage() {
  return (
    <RequireSuperAdmin>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">System-level configuration for super admins.</p>

        <Card className="mt-6">
          <CardBody className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-700">Company</p>
              <p className="text-sm text-neutral-500">{process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Essence Store"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-700">Support email</p>
              <p className="text-sm text-neutral-500">{process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</p>
            </div>
            <Alert tone="info">
              Branding is configured via environment variables (NEXT_PUBLIC_COMPANY_NAME, NEXT_PUBLIC_SUPPORT_EMAIL)
              so it can differ per deployment without a code change.
            </Alert>
          </CardBody>
        </Card>

        <Card className="mt-6">
          <CardBody>
            <p className="text-sm font-medium text-neutral-700">Admin roles</p>
            <p className="mt-1 text-sm text-neutral-500">
              Manage who has admin or super admin access from the{" "}
              <a href="/admin/users" className="text-brand-700 hover:underline">
                Users
              </a>{" "}
              page.
            </p>
          </CardBody>
        </Card>
      </div>
    </RequireSuperAdmin>
  );
}
