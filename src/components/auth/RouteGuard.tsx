"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/permissions";
import { PageSpinner } from "@/components/ui/Spinner";

/**
 * Client-side route protection. This gates UI rendering only — it is a UX
 * layer, not a security boundary. The actual boundary is Firestore/Storage
 * security rules and Cloud Function authorization checks, which apply
 * regardless of what this component does or whether JavaScript runs at all.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <PageSpinner />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?redirect=/admin");
      return;
    }
    if (!isAdmin(role)) router.replace("/dashboard?error=not-authorized");
  }, [loading, user, role, router]);

  if (loading || !user || !isAdmin(role)) return <PageSpinner />;
  return <>{children}</>;
}

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?redirect=/admin/settings");
      return;
    }
    if (role !== "super_admin") router.replace("/admin?error=not-authorized");
  }, [loading, user, role, router]);

  if (loading || !user || role !== "super_admin") return <PageSpinner />;
  return <>{children}</>;
}
