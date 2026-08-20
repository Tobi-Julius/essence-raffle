"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Gift,
  Wallet,
  Users,
  ScrollText,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { logoutUser } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/useAuth";
import { canManageAdmins } from "@/lib/permissions";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/raffles", label: "Raffles", icon: Gift, exact: false },
  { href: "/admin/payments", label: "Payments", icon: Wallet, exact: false },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, exact: false },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, profile } = useAuth();

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-950 p-5 text-neutral-200 lg:flex">
        <Logo className="mb-8 [&_img]:brightness-0 [&_img]:invert" />
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active ? "bg-brand-600 text-white" : "text-neutral-300 hover:bg-neutral-900",
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
          {canManageAdmins(role) && (
            <Link
              href="/admin/settings"
              className={cn(
                "focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                pathname.startsWith("/admin/settings") ? "bg-brand-600 text-white" : "text-neutral-300 hover:bg-neutral-900",
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          )}
        </nav>
        <Link
          href="/raffles"
          target="_blank"
          className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-900"
        >
          <ExternalLink className="h-4 w-4" /> View public site
        </Link>
        <div className="mt-2 rounded-lg bg-neutral-900 px-3 py-2.5 text-xs text-neutral-400">
          Signed in as
          <p className="truncate text-sm font-medium text-neutral-100">{profile?.fullName ?? "…"}</p>
        </div>
        <button
          onClick={async () => {
            await logoutUser();
            router.push("/");
          }}
          className="focus-ring mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-900"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>
      <div className="flex-1">
        <MobileAdminBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function MobileAdminBar() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo />
        <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white">Admin</span>
      </div>
      <nav className="flex gap-4 overflow-x-auto px-4 pb-3 text-sm">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn("whitespace-nowrap font-medium", active ? "text-brand-700" : "text-neutral-500")}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
