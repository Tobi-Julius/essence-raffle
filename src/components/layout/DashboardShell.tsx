"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Gift, LayoutGrid, LogOut, User } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { logoutUser } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/dashboard", label: "My Raffles", icon: Gift, exact: true },
  { href: "/raffles", label: "Browse Raffles", icon: LayoutGrid, exact: false },
  { href: "/dashboard/profile", label: "Profile", icon: User, exact: true },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-white p-5 md:flex">
        <Logo className="mb-8" />
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active ? "bg-brand-50 text-brand-700" : "text-neutral-600 hover:bg-neutral-50",
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={async () => {
            await logoutUser();
            router.push("/");
          }}
          className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>
      <div className="flex-1">
        <MobileTopBar />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function MobileTopBar() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo />
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
