import type { Priority } from "@/types/itsm";
import { PRIORITY_LABELS } from "@/types/itsm";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const priorityVariant: Record<
  Priority,
  "destructive" | "warning" | "secondary" | "outline"
> = {
  P1: "destructive",
  P2: "warning",
  P3: "secondary",
  P4: "outline",
};

export function PriorityBadge({
  priority,
  showLabel = true,
  className,
}: {
  priority: Priority;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <Badge variant={priorityVariant[priority]} className={cn(className)}>
      {priority}
      {showLabel ? ` · ${PRIORITY_LABELS[priority]}` : null}
    </Badge>
  );
}
