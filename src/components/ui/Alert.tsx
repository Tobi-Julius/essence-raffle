import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "success" | "error" | "warning" | "info";

const toneConfig: Record<Tone, { icon: typeof Info; classes: string }> = {
  success: { icon: CheckCircle2, classes: "bg-success-soft text-brand-800 border-brand-200" },
  error: { icon: XCircle, classes: "bg-error-soft text-red-800 border-red-200" },
  warning: { icon: AlertTriangle, classes: "bg-warning-soft text-amber-800 border-amber-200" },
  info: { icon: Info, classes: "bg-info-soft text-blue-800 border-blue-200" },
};

export function Alert({ tone = "info", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  const { icon: Icon, classes } = toneConfig[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4 text-sm", classes)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
      </div>
    </div>
  );
}
