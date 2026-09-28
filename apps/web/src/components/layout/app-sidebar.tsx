import {
  AlertTriangleIcon,
  ClipboardListIcon,
  LayoutGridIcon,
  LifeBuoyIcon,
  ListTodoIcon,
  PanelLeftIcon,
  TicketIcon,
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
  {
    to: "/catalog",
    label: "Catalog",
    icon: LayoutGridIcon,
    roles: ["Admin", "Agent", "EndUser"],
  },
  {
    to: "/requests",
    label: "Requests",
    icon: ListTodoIcon,
    roles: ["Admin", "Agent", "EndUser"],
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
        "sidebar-gradient text-sidebar-foreground border-sidebar-border flex h-full flex-col border-r transition-[width] duration-300 ease-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex h-18 items-center gap-2.5 px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <PanelLeftIcon />
        </Button>
        {!collapsed ? (
          <div className="flex min-w-0 items-center gap-2 animate-in-up">
            <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-7 items-center justify-center rounded-lg shadow-soft">
              <TicketIcon className="size-3.5" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[25px] font-bold tracking-tight leading-none">Sadhox</p>
              <p className="text-sidebar-foreground/55 truncate text-[10px]">Service desk</p>
            </div>
          </div>
        ) : null}
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex flex-1 flex-col gap-1 p-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={`${item.to}-${item.label}`}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-normal transition-all duration-200",
                  "text-sidebar-foreground/70 hover:bg-white hover:text-[#5041BC] hover:font-bold",
                  isActive && "bg-white text-[#5041BC] font-bold shadow-soft",
                  collapsed && "justify-center px-0",
                )
              }
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#5041BC]" />
                  ) : null}
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:text-[#5041BC]",
                      isActive && "text-[#5041BC]",
                    )}
                  />
                  {!collapsed ? <span>{item.label}</span> : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
