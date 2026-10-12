import { useEffect, useState } from "react";
import { ChevronDownIcon, PanelLeftIcon } from "lucide-react";
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
  roles: UserRole[];
}

interface NavChildLink {
  kind?: "link";
  to: string;
  label: string;
  roles?: UserRole[];
}

interface NavChildGroup {
  kind: "group";
  id: string;
  label: string;
  roles?: UserRole[];
  children: NavChildLink[];
}

type NavGroupChild = NavChildLink | NavChildGroup;

interface NavGroupItem {
  kind: "group";
  id: string;
  label: string;
  roles: UserRole[];
  children: NavGroupChild[];
}

type NavItem = NavLinkItem | NavGroupItem;

function roleAllows(roles: UserRole[] | undefined, role: UserRole | undefined): boolean {
  if (!role) return false;
  if (!roles) return true;
  return roles.includes(role);
}

function filterGroupChildren(
  children: NavGroupChild[],
  role: UserRole | undefined,
): NavGroupChild[] {
  return children.flatMap((child): NavGroupChild[] => {
    if (!roleAllows(child.roles, role)) return [];
    if (child.kind === "group") {
      const nested = filterGroupChildren(child.children, role).filter(
        (entry): entry is NavChildLink => entry.kind !== "group",
      );
      if (nested.length === 0) return [];
      return [{ ...child, children: nested }];
    }
    return [child];
  });
}

function collectLeafLinks(children: NavGroupChild[]): NavChildLink[] {
  return children.flatMap((child) =>
    child.kind === "group" ? child.children : [child],
  );
}

function pathMatches(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function groupHasActivePath(children: NavGroupChild[], pathname: string): boolean {
  return collectLeafLinks(children).some((child) => pathMatches(pathname, child.to));
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    roles: ["Admin"],
  },
  {
    to: "/manager",
    label: "Home",
    roles: ["Manager"],
  },
  {
    to: "/admin/users",
    label: "Users",
    roles: ["Admin"],
  },
  {
    kind: "group",
    id: "workspace",
    label: "Workspace",
    roles: ["Admin", "Agent", "Manager", "EndUser"],
    children: [
      {
        to: "/admin/projects",
        label: "Projects",
        roles: ["Admin"],
      },
      {
        kind: "group",
        id: "incident-desk",
        label: "Ticket desk",
        roles: ["Admin", "Agent", "Manager"],
        children: [
          {
            to: "/incidents",
            label: "Tickets",
          },
          {
            to: "/problems",
            label: "Issues",
          },
        ],
      },
      {
        to: "/incidents",
        label: "Tickets",
        roles: ["EndUser"],
      },
      {
        to: "/requests",
        label: "Requests",
        roles: ["Admin", "Agent", "EndUser", "Manager"],
      },
      {
        to: "/changes",
        label: "Change requests",
        roles: ["Admin", "Agent", "Manager", "EndUser"],
      },
      {
        to: "/assets",
        label: "Assets",
        roles: ["Admin"],
      },
    ],
  },
  {
    to: "/admin/knowledge",
    label: "Knowledge Base",
    roles: ["Admin"],
  },
  {
    to: "/admin/sla-rules",
    label: "Response time",
    roles: ["Admin"],
  },
  {
    to: "/admin/escalation",
    label: "Escalation",
    roles: ["Admin"],
  },
  {
    to: "/admin/queues",
    label: "Queues",
    roles: ["Admin"],
  },
  {
    to: "/admin/catalog",
    label: "Catalog admin",
    roles: ["Admin"],
  },
  {
    to: "/knowledge",
    label: "Knowledge Base",
    // Admin uses the merged /admin/knowledge browse + authoring page
    roles: ["Agent", "EndUser"],
  },
  {
    to: "/approvals",
    label: "Approvals",
    roles: ["Admin", "Manager"],
  },
  {
    to: "/admin/audit-logs",
    label: "Audit logs",
    roles: ["Admin"],
  },
];

const navItemClass = (isActive: boolean, collapsed: boolean) =>
  cn(
    "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-normal transition-all duration-200",
    "text-sidebar-item-foreground",
    "hover:bg-sidebar-item-hover hover:text-sidebar-item-hover-foreground hover:font-bold",
    isActive &&
      "bg-sidebar-item-active! text-sidebar-item-active-foreground! font-bold shadow-soft",
    collapsed && "justify-center px-1",
  );

function SidebarLink({
  to,
  label,
  collapsed,
  end,
}: {
  to: string;
  label: string;
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
          <span
            className={cn(
              "truncate",
              collapsed && "text-center text-[10px] leading-tight",
            )}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

function SidebarNavGroup({
  item,
  collapsed,
  nested = false,
}: {
  item: NavGroupItem | (NavChildGroup & { roles?: UserRole[] });
  collapsed: boolean;
  nested?: boolean;
}) {
  const location = useLocation();
  const childActive = groupHasActivePath(item.children, location.pathname);
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  // Collapsed: flatten to leaf text links
  if (collapsed) {
    return (
      <div className="flex flex-col gap-1">
        {collectLeafLinks(item.children).map((child) => (
          <SidebarLink
            key={child.to}
            to={child.to}
            label={child.label}
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
          nested && "py-2 text-[13px]",
        )}
        aria-expanded={open}
        title={item.label}
      >
        {childActive ? (
          <span className="bg-sidebar-item-indicator absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full" />
        ) : null}
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 opacity-60 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          className={cn(
            "ml-3 flex flex-col gap-0.5 border-l border-sidebar-border pl-2",
            nested && "ml-2",
          )}
        >
          {item.children.map((child) =>
            child.kind === "group" ? (
              <SidebarNavGroup
                key={child.id}
                item={child}
                collapsed={false}
                nested
              />
            ) : (
              <SidebarLink
                key={child.to}
                to={child.to}
                label={child.label}
                collapsed={false}
              />
            ),
          )}
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
  const items = NAV_ITEMS.flatMap((item): NavItem[] => {
    if (!roleAllows(item.roles, role)) return [];
    if (item.kind === "group") {
      const children = filterGroupChildren(item.children, role);
      if (children.length === 0) return [];
      return [{ ...item, children }];
    }
    return [item];
  });

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
              collapsed={collapsed}
            />
          ),
        )}
      </nav>
    </aside>
  );
}
