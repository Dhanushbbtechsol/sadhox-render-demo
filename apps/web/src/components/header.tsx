import { NavLink } from "react-router";

import type { Role } from "@/features/admin/types";
import { useAuthStore } from "@/stores/auth-store";

import { ModeToggle } from "./mode-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const roles: Role[] = ["Admin", "Agent", "EndUser"];

export default function Header() {
  const role = useAuthStore((state) => state.role);
  const setRole = useAuthStore((state) => state.setRole);
  const links = [
    { to: "/", label: "Home" },
    { to: "/admin/dashboard", label: "Dashboard" },
  ] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => {
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => (isActive ? "font-bold" : "")}
                end
              >
                {label}
              </NavLink>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Select value={role} onValueChange={(value) => setRole(value as Role)}>
            <SelectTrigger aria-label="Phase 1 role stub" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}
