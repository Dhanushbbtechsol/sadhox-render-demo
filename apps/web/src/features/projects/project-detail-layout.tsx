import { NavLink, Navigate, Outlet, useParams } from "react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useProject } from "./hooks";

export default function ProjectDetailLayout() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);

  if (!id) return <Navigate to="/admin/projects" replace />;

  if (project.isLoading) {
    return <Skeleton className="h-40" />;
  }

  if (project.isError || !project.data) {
    return <Navigate to="/admin/projects" replace />;
  }

  const tabs = [
    { to: `/admin/projects/${id}`, label: "Overview", end: true },
    { to: `/admin/projects/${id}/members`, label: "Members", end: false },
    { to: `/admin/projects/${id}/modules`, label: "Modules", end: false },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-muted-foreground text-sm">
          <NavLink to="/admin/projects" className="hover:underline">
            Projects
          </NavLink>
          <span className="mx-1">/</span>
          {project.data.name}
        </p>
        <h1 className="text-xl font-semibold">{project.data.name}</h1>
      </div>

      <nav className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "px-3 py-2 text-sm",
                isActive
                  ? "border-b-2 border-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
