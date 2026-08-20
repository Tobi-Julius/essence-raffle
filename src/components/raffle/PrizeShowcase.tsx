import Image from "next/image";
import { Gift } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/utils/money";
import type { Prize } from "@/types/firestore";

export function PrizeShowcase({ prize }: { prize: Prize | null }) {
  if (!prize) return null;
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 sm:grid-cols-2">
        <div className="relative flex aspect-video items-center justify-center bg-brand-50 sm:aspect-auto">
          {prize.imageUrl ? (
            <Image src={prize.imageUrl} alt={prize.name} fill className="object-cover" />
          ) : (
            <Gift className="h-12 w-12 text-brand-300" />
          )}
        </div>
        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">The Prize</p>
          <h3 className="mt-1 text-lg font-semibold text-neutral-900">{prize.name}</h3>
          {typeof prize.value === "number" && prize.currency && (
            <p className="mt-1 text-brand-700 font-semibold">{formatMoney(prize.value, prize.currency)}</p>
          )}
          <p className="mt-2 text-sm text-neutral-600">{prize.description}</p>
        </div>
      </div>
      {prize.videoUrl && (
        <div className="border-t border-neutral-100 p-5">
          <p className="mb-2 text-sm font-medium text-neutral-700">Prize video</p>
          <video controls className="w-full rounded-xl" src={prize.videoUrl} preload="metadata" />
        </div>
      )}
    </Card>
  );
}
