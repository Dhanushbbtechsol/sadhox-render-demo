import { FolderKanbanIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: projects = [], isLoading, isError, error } = useProjects();

  const allocationLabel =
    user?.role === "Manager"
      ? "Projects you manage"
      : user?.role === "Admin"
        ? "All projects"
        : "Projects you are allocated to";

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Your account details and project allocations.
        </p>
      </header>

      <section className="border-border/80 space-y-3 rounded-xl border p-5">
        <h2 className="text-sm font-semibold tracking-tight">Account</h2>
        {user ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Name</dt>
              <dd className="text-sm font-medium">{user.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Email</dt>
              <dd className="text-sm font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Role</dt>
              <dd className="mt-1">
                <Badge variant="secondary">{user.role}</Badge>
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="border-border/80 space-y-4 rounded-xl border p-5">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <FolderKanbanIcon className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {allocationLabel}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {user?.role === "Manager"
                ? "Projects where you are the assigned manager."
                : user?.role === "Admin"
                  ? "Admins can see every project in the organisation."
                  : "Only projects an Admin has added you to appear here and in ticket project pickers."}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}

        {isError ? (
          <p className="text-destructive text-sm">
            {error instanceof Error
              ? error.message
              : "Failed to load projects"}
          </p>
        ) : null}

        {!isLoading && !isError && projects.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No projects allocated yet. Ask an Admin to add you to a project.
          </p>
        ) : null}

        {!isLoading && !isError && projects.length > 0 ? (
          <ul className="divide-border/80 divide-y rounded-lg border">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="text-sm font-medium">{project.name}</span>
                {project.managerName ? (
                  <span className="text-muted-foreground text-xs">
                    Manager: {project.managerName}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
