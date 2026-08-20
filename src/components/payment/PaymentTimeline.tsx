import { Check, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PaymentStatus } from "@/types/firestore";

interface Step {
  label: string;
  state: "done" | "current" | "pending" | "failed";
}

function stepsFor(paymentStatus: PaymentStatus, hasReceipt: boolean): Step[] {
  const registrationDone: Step = { label: "Registration", state: "done" };
  const termsDone: Step = { label: "Terms accepted", state: "done" };

  if (paymentStatus === "rejected") {
    return [
      registrationDone,
      termsDone,
      { label: "Payment submitted", state: "failed" },
      { label: "Official entry", state: "pending" },
    ];
  }
  if (paymentStatus === "approved") {
    return [
      registrationDone,
      termsDone,
      { label: "Payment approved", state: "done" },
      { label: "Official entry", state: "done" },
    ];
  }
  if (paymentStatus === "verification_pending") {
    return [
      registrationDone,
      termsDone,
      { label: "Payment submitted", state: "done" },
      { label: "Verification", state: "current" },
      { label: "Official entry", state: "pending" },
    ];
  }
  return [
    registrationDone,
    termsDone,
    { label: hasReceipt ? "Payment submitted" : "Payment submitted", state: hasReceipt ? "current" : "current" },
    { label: "Official entry", state: "pending" },
  ];
}

export function PaymentTimeline({ paymentStatus, hasReceipt }: { paymentStatus: PaymentStatus; hasReceipt: boolean }) {
  const steps = stepsFor(paymentStatus, hasReceipt);
  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.label} className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              step.state === "done" && "bg-brand-600 text-white",
              step.state === "current" && "bg-amber-100 text-amber-700",
              step.state === "pending" && "bg-neutral-100 text-neutral-400",
              step.state === "failed" && "bg-red-100 text-red-600",
            )}
          >
            {step.state === "done" && <Check className="h-3.5 w-3.5" />}
            {step.state === "current" && <Clock className="h-3.5 w-3.5" />}
            {step.state === "failed" && <X className="h-3.5 w-3.5" />}
          </span>
          <span
            className={cn(
              "text-sm",
              step.state === "pending" ? "text-neutral-400" : "font-medium text-neutral-800",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
