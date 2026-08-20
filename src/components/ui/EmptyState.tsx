import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 px-6 py-14 text-center">
      <div className="rounded-full bg-neutral-100 p-3">
        <Icon className="h-6 w-6 text-neutral-400" />
      </div>
      <div>
        <p className="font-medium text-neutral-800">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
