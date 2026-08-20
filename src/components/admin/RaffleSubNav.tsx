"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function RaffleSubNav({ raffleId }: { raffleId: string }) {
  const pathname = usePathname();
  const base = `/admin/raffles/${raffleId}`;
  const tabs = [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/edit`, label: "Edit" },
    { href: `${base}/prizes`, label: "Prize" },
    { href: `${base}/terms`, label: "Terms" },
    { href: `${base}/participants`, label: "Participants" },
    { href: `${base}/payments`, label: "Payments" },
    { href: `${base}/draw`, label: "Draw" },
    { href: `${base}/winners`, label: "Winners" },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "focus-ring -mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium",
              active ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
