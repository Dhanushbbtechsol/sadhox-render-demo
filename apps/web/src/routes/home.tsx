import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export default function Home() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Sadhox</h1>
        <p className="text-muted-foreground">
          Service catalog and change management portal (Dev B Phase 1 stubs).
        </p>
      </div>

      <section className="space-y-3 rounded-none border p-4">
        <h2 className="font-medium">Get started</h2>
        {isAuthenticated && user ? (
          <p className="text-sm">
            Signed in as <strong>{user.name}</strong> ({user.role}).
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Sign in with a mock role to browse the catalog and verify permission gates.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {isAuthenticated ? (
            <>
              <Link to="/catalog">
                <Button>Browse catalog</Button>
              </Link>
              <Link to="/requests">
                <Button variant="outline">View requests</Button>
              </Link>
            </>
          ) : (
            <Link to="/login">
              <Button>Sign in</Button>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
