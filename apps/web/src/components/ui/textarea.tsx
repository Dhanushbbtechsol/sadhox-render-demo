import * as React from "react";

import { capitalizeInitial } from "@/lib/capitalize-initial";
import { cn } from "@/lib/utils";

function Textarea({
  className,
  onChange,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "dark:bg-input/30 border-input bg-card/80 focus-visible:border-primary/50 focus-visible:ring-primary/25 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive placeholder:text-muted-foreground flex field-sizing-content min-h-24 w-full rounded-lg border px-3 py-2.5 text-sm shadow-soft transition-all duration-200 outline-none hover:border-primary/25 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
      onChange={(event) => {
        const next = capitalizeInitial(event.target.value);
        if (next !== event.target.value) {
          event.target.value = next;
        }
        onChange?.(event);
      }}
    />
  );
}

export { Textarea };
