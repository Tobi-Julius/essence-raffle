import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PaginationProps {
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  pageLabel?: string;
}

/** Cursor-based pagination — pairs with Firestore `startAfter` cursors from the services layer. */
export function Pagination({ onPrevious, onNext, hasPrevious, hasNext, pageLabel }: PaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-neutral-100 px-2 py-3">
      <span className="text-sm text-neutral-500">{pageLabel}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPrevious} disabled={!hasPrevious}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
