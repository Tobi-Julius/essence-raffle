import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

export function PublicFooter() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@essencestore.example";
  return (
    <footer className="border-t border-neutral-100 bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-sm text-sm text-neutral-500">
            Official raffles from Essence Store. Every draw is conducted securely and every winner is verified.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-neutral-500">
          <Link href="/raffles" className="hover:text-brand-700">
            Browse raffles
          </Link>
          <a href={`mailto:${supportEmail}`} className="hover:text-brand-700">
            {supportEmail}
          </a>
        </div>
      </div>
      <div className="border-t border-neutral-100 px-4 py-4 text-center text-xs text-neutral-400 sm:px-6">
        © {new Date().getFullYear()} Essence Store. All rights reserved.
      </div>
    </footer>
  );
}
