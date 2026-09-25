import {
  AlertTriangleIcon,
  ClipboardListIcon,
  LifeBuoyIcon,
  PanelLeftIcon,
} from "lucide-react";
import { NavLink } from "react-router";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types/itsm";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/incidents",
    label: "Incidents",
    icon: AlertTriangleIcon,
    roles: ["Admin", "Agent"],
  },
  {
    to: "/problems",
    label: "Problems",
    icon: ClipboardListIcon,
    roles: ["Admin", "Agent"],
  },
  {
    to: "/portal",
    label: "My Portal",
    icon: LifeBuoyIcon,
    roles: ["EndUser", "Admin"],
  },
];

export function AppSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const role = useAuthStore((s) => s.user?.role);
  const items = NAV_ITEMS.filter((item) => (role ? item.roles.includes(role) : false));

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full flex-col border-r transition-[width] duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className="flex h-12 items-center gap-2 px-3">
        <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Toggle sidebar">
          <PanelLeftIcon />
        </Button>
        {!collapsed ? (
          <span className="text-sm font-semibold tracking-tight">Sadhox</span>
        ) : null}
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={`${item.to}-${item.label}`}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-none px-2 py-2 text-xs transition-colors",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                  collapsed && "justify-center px-0",
                )
              }
              title={item.label}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
