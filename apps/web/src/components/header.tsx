import { NavLink } from "react-router";

import { Can } from "@/components/auth/protected-route";
import { ModeToggle } from "./mode-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const links = [
    { to: "/", label: "Home", end: true },
    ...(isAuthenticated
      ? [
          { to: "/catalog", label: "Catalog", end: false },
          { to: "/requests", label: "Requests", end: false },
        ]
      : []),
  ] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex flex-wrap gap-4 text-lg">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "font-bold" : "")}
              end={end}
            >
              {label}
            </NavLink>
          ))}
          <Can roles={["Agent", "Admin"]}>
            <NavLink
              to="/changes"
              className={({ isActive }) => (isActive ? "font-bold" : "")}
            >
              Changes
            </NavLink>
          </Can>
          <Can roles={["Admin"]}>
            <NavLink
              to="/approvals"
              className={({ isActive }) => (isActive ? "font-bold" : "")}
            >
              Approvals
            </NavLink>
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) => (isActive ? "font-bold" : "")}
            >
              Dashboard
            </NavLink>
          </Can>
        </nav>
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <>
              <Badge variant="outline">{user.role}</Badge>
              <span className="text-muted-foreground hidden text-sm sm:inline">
                {user.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void logout().then(() => {
                    window.location.assign("/login");
                  });
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <NavLink to="/login" className="text-sm font-medium">
              Sign in
            </NavLink>
          )}
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}
