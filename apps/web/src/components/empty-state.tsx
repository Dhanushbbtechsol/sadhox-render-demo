import { InboxIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function TicketListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading tickets">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="border-border/80 bg-card flex items-center gap-4 rounded-xl border px-4 py-4 shadow-soft"
        >
          <Skeleton className="h-4 w-16 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 max-w-md rounded-md" />
            <Skeleton className="h-3 w-1/3 max-w-xs rounded-md" />
          </div>
          <Skeleton className="h-6 w-14 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
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
        "border-border/80 bg-card/60 text-muted-foreground flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center shadow-soft animate-in-up",
        className,
      )}
    >
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
        <InboxIcon className="size-6 opacity-70" />
      </span>
      <div className="space-y-1.5">
        <p className="text-foreground text-base font-semibold tracking-tight">{title}</p>
        <p className="max-w-sm text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}
