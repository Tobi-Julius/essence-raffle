"use client";

import { useRouter } from "next/navigation";
import { RaffleForm, emptyRaffleForm } from "@/components/admin/RaffleForm";
import { createDraftRaffle } from "@/services/raffles";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";

export default function CreateRafflePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Create a raffle</h1>
      <p className="mt-1 text-sm text-neutral-500">
        This saves as a draft. You can add the prize and terms, then publish when ready.
      </p>
      <div className="mt-6">
        <RaffleForm
          initial={emptyRaffleForm}
          submitLabel="Save draft & continue"
          onSubmit={async (input) => {
            if (!user) return;
            const id = await createDraftRaffle(input, user.uid);
            show("success", "Raffle draft created.");
            router.push(`/admin/raffles/${id}`);
          }}
        />
      </div>
    </div>
  );
}
