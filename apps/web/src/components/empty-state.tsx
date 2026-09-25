import { InboxIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function TicketListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading tickets">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="border-border flex items-center gap-4 border px-4 py-3"
        >
          <Skeleton className="h-4 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 max-w-md" />
            <Skeleton className="h-3 w-1/3 max-w-xs" />
          </div>
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border text-muted-foreground flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      <InboxIcon className="size-10 opacity-40" />
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="max-w-sm text-xs">{description}</p>
      </div>
      {action}
    </div>
  );
}
