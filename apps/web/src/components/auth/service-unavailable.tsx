import { useState } from "react";
import { Link } from "react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

/** Full-page gate on protected routes when the API is unreachable. */
export function ServiceUnavailableScreen() {
  const retryRestore = useAuthStore((s) => s.retryRestore);
  const [pending, setPending] = useState(false);

  async function handleRetry() {
    setPending(true);
    try {
      await retryRestore();
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="bg-background flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        Service unavailable
      </h1>
      <p className="text-muted-foreground max-w-md text-sm">
        We can&apos;t reach the service right now. Your session is kept — try
        again when the connection is back.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => void handleRetry()} disabled={pending}>
          {pending ? "Retrying…" : "Retry"}
        </Button>
        <Link
          to="/login"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
