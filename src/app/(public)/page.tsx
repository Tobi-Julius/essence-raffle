"use client";

import Link from "next/link";
import { ShieldCheck, Wallet, Ticket, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RaffleGrid } from "@/components/raffle/RaffleGrid";
import { useAuth } from "@/hooks/useAuth";

const steps = [
  {
    icon: Ticket,
    title: "Register & accept terms",
    description:
      "Pick a raffle, create an account, and accept that raffle's terms.",
  },
  {
    icon: Wallet,
    title: "Pay by bank transfer",
    description: "Transfer the entry fee and upload your payment receipt.",
  },
  {
    icon: ShieldCheck,
    title: "Get verified",
    description:
      "Our team verifies your receipt and issues your official entry number.",
  },
  {
    icon: PartyPopper,
    title: "Watch the draw",
    description: "Winners are selected securely and revealed live.",
  },
];

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800">
            Official Essence Store Raffles
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Win big with Essence Store raffles
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-neutral-600">
            Enter our official raffles for a chance to win real prizes. Every
            entry is verified and every draw is conducted securely, from
            registration to the winner reveal.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/raffles">
              <Button size="lg">Browse raffles</Button>
            </Link>
            {user || authLoading ? null : (
              <Link href="/register">
                <Button size="lg" variant="outline">
                  Create an account
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-xl font-semibold text-neutral-900">
          How it works
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-neutral-200 p-5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {i + 1}
              </div>
              <step.icon className="mt-4 h-6 w-6 text-brand-600" />
              <p className="mt-3 font-medium text-neutral-900">{step.title}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900">
            Present raffles
          </h2>
          <Link
            href="/raffles"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            View all
          </Link>
        </div>
        <RaffleGrid section="present" pageSize={3} hidePagination />
      </section>
    </div>
  );
}
