import { NavLink, Outlet } from "react-router";

import { cn } from "@/lib/utils";

const links = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/assets", label: "Assets" },
  { to: "/admin/audit-logs", label: "Audit logs" },
] as const;

export default function AdminLayout() {
  return (
    <div className="grid h-full min-h-0 md:grid-cols-[200px_1fr]">
      <aside className="border-b md:border-r md:border-b-0">
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "rounded-none px-3 py-2 text-sm whitespace-nowrap",
                  isActive ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 overflow-auto p-4">
        <Outlet />
      </div>
    </div>
  );
}
