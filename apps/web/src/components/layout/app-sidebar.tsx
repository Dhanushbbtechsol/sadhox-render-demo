import { useEffect, useState } from "react";
import {
  AlertTriangleIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  GitBranchIcon,
  FolderKanbanIcon,
  InboxIcon,
  LayoutGridIcon,
  LifeBuoyIcon,
  ListTodoIcon,
  PackageIcon,
  PanelLeftIcon,
  ScrollTextIcon,
  ServerIcon,
  Settings2Icon,
  TimerIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types/itsm";
import { cn } from "@/lib/utils";

interface NavLinkItem {
  kind?: "link";
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

interface NavChildItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroupItem {
  kind: "group";
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  children: NavChildItem[];
}

type NavItem = NavLinkItem | NavGroupItem;

const NAV_ITEMS: NavItem[] = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    roles: ["Admin"],
  },
  {
    to: "/manager",
    label: "Home",
    icon: LayoutDashboardIcon,
    roles: ["Manager"],
  },
  {
    to: "/admin/projects",
    label: "Projects",
    icon: FolderKanbanIcon,
    roles: ["Admin"],
  },
  {
    to: "/assets",
    label: "Assets",
    icon: PackageIcon,
    roles: ["Admin"],
  },
  {
    to: "/admin/knowledge",
    label: "Knowledge",
    icon: BookOpenIcon,
    roles: ["Admin"],
  },
  {
    to: "/admin/sla-rules",
    label: "SLA rules",
    icon: TimerIcon,
    roles: ["Admin"],
  },
  {
    to: "/admin/audit-logs",
    label: "Audit logs",
    icon: ScrollTextIcon,
    roles: ["Admin"],
  },
  {
    to: "/admin/queues",
    label: "Queues",
    icon: ServerIcon,
    roles: ["Admin"],
  },
  {
    to: "/admin/catalog",
    label: "Catalog admin",
    icon: Settings2Icon,
    roles: ["Admin"],
  },
  {
    kind: "group",
    id: "incident-desk",
    label: "Incident Desk",
    icon: AlertTriangleIcon,
    roles: ["Admin", "Agent", "Manager"],
    children: [
      {
        to: "/incidents",
        label: "Incidents",
        icon: AlertTriangleIcon,
      },
      {
        to: "/problems",
        label: "Problems",
        icon: ClipboardListIcon,
      },
    ],
  },
  {
    to: "/portal",
    label: "My Portal",
    icon: LifeBuoyIcon,
    roles: ["EndUser", "Admin"],
  },
  {
    to: "/knowledge",
    label: "Knowledge",
    icon: BookOpenIcon,
    // Admin uses the merged /admin/knowledge browse + authoring page
    roles: ["Agent", "EndUser"],
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
    roles: ["Admin", "Agent", "EndUser", "Manager"],
  },
  {
    to: "/changes",
    label: "Changes",
    icon: GitBranchIcon,
    roles: ["Admin", "Agent", "Manager"],
  },
  {
    to: "/approvals",
    label: "Approvals",
    icon: InboxIcon,
    roles: ["Admin", "Manager"],
  },
];

const navItemClass = (isActive: boolean, collapsed: boolean) =>
  cn(
    "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-normal transition-all duration-200",
    "text-sidebar-item-foreground",
    "hover:bg-sidebar-item-hover hover:text-sidebar-item-hover-foreground hover:font-bold",
    isActive &&
      "bg-sidebar-item-active! text-sidebar-item-active-foreground! font-bold shadow-soft",
    collapsed && "justify-center px-0",
  );

function SidebarLink({
  to,
  label,
  icon: Icon,
  collapsed,
  end,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  collapsed: boolean;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => navItemClass(isActive, collapsed)}
      title={label}
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span className="bg-sidebar-item-indicator absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full" />
          ) : null}
          <Icon
            className={cn(
              "size-4 shrink-0 transition-all duration-200 group-hover:scale-110",
              isActive
                ? "text-sidebar-item-active-foreground"
                : "group-hover:text-sidebar-item-hover-foreground",
            )}
          />
          {!collapsed ? <span>{label}</span> : null}
        </>
      )}
    </NavLink>
  );
}

function SidebarNavGroup({
  item,
  collapsed,
}: {
  item: NavGroupItem;
  collapsed: boolean;
}) {
  const location = useLocation();
  const childActive = item.children.some(
    (child) =>
      location.pathname === child.to || location.pathname.startsWith(`${child.to}/`),
  );
  const [open, setOpen] = useState(childActive);
  const Icon = item.icon;

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  // Collapsed: show child links as icon-only (first child as primary shortcut)
  if (collapsed) {
    return (
      <div className="flex flex-col gap-1">
        {item.children.map((child) => (
          <SidebarLink
            key={child.to}
            to={child.to}
            label={child.label}
            icon={child.icon}
            collapsed
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-normal transition-all duration-200",
          "text-sidebar-item-foreground",
          "hover:bg-sidebar-item-hover hover:text-sidebar-item-hover-foreground hover:font-bold",
          childActive && "font-bold",
        )}
        aria-expanded={open}
        title={item.label}
      >
        {childActive ? (
          <span className="bg-sidebar-item-indicator absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full" />
        ) : null}
        <Icon
          className={cn(
            "size-4 shrink-0 transition-all duration-200 group-hover:scale-110",
            "group-hover:text-sidebar-item-hover-foreground",
          )}
        />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 opacity-60 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
          {item.children.map((child) => (
            <SidebarLink
              key={child.to}
              to={child.to}
              label={child.label}
              icon={child.icon}
              collapsed={false}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
            <img
              src="/yukti-logo.jpg"
              alt="Yukti"
              className="size-8 shrink-0 rounded-lg object-cover shadow-soft"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[25px] font-bold tracking-tight leading-none">Yukti</p>
              <p className="text-sidebar-foreground/55 truncate text-[10px]">Service desk</p>
            </div>
          </div>
        ) : null}
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex flex-1 flex-col gap-1 p-2.5">
        {items.map((item) =>
          item.kind === "group" ? (
            <SidebarNavGroup key={item.id} item={item} collapsed={collapsed} />
          ) : (
            <SidebarLink
              key={`${item.to}-${item.label}`}
              to={item.to}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
            />
          ),
        )}
      </nav>
    </aside>
  );
}
