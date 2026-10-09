import { BellIcon, ChevronDownIcon, LogOutIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMarkNotificationRead,
  useNotifications,
} from "@/features/admin/hooks";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TopNavbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();

  const items = notifications.data ?? [];
  const unreadCount = items.filter((n) => n.readAt == null).length;

  async function handleLogout() {
    await logout();
    void navigate("/login", { replace: true });
  }

  async function handleNotificationClick(id: string, href: string | null) {
    try {
      if (items.find((n) => n.id === id)?.readAt == null) {
        await markRead.mutateAsync(id);
      }
      if (href) {
        void navigate(href);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not open notification",
      );
    }
  }

  return (
    <header className="border-border/80 bg-card flex h-18 items-center justify-between gap-4 border-b px-4 md:px-6">
      <div>
        <p className="text-foreground text-sm font-medium tracking-tight">
          IT Service Management
        </p>
        <p className="text-muted-foreground hidden text-xs sm:block">
          Track, prioritize, and resolve tickets
        </p>
      </div>
      <div className="flex items-center gap-2">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-muted/70 relative rounded-xl"
                  aria-label="Notifications"
                />
              }
            >
              <BellIcon className="size-4" />
              {unreadCount > 0 ? (
                <span className="bg-primary text-primary-foreground absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-80 rounded-xl p-1.5 shadow-lift"
            >
              <div className="px-2.5 py-2">
                <p className="text-sm font-semibold">Notifications</p>
                <p className="text-muted-foreground text-xs">
                  {unreadCount === 0
                    ? "You are caught up"
                    : `${unreadCount} unread`}
                </p>
              </div>
              <DropdownMenuSeparator className="mx-1" />
              {notifications.isLoading ? (
                <p className="text-muted-foreground px-2.5 py-3 text-xs">
                  Loading…
                </p>
              ) : null}
              {notifications.isError ? (
                <p className="text-destructive px-2.5 py-3 text-xs">
                  {notifications.error instanceof Error
                    ? notifications.error.message
                    : "Failed to load"}
                </p>
              ) : null}
              {items.length === 0 && !notifications.isLoading ? (
                <p className="text-muted-foreground px-2.5 py-3 text-xs">
                  No notifications yet
                </p>
              ) : null}
              <div className="max-h-80 overflow-y-auto">
                {items.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer flex-col items-start gap-0.5 rounded-lg px-2.5 py-2",
                      item.readAt == null && "bg-muted/40",
                    )}
                    onClick={() =>
                      void handleNotificationClick(item.id, item.href)
                    }
                  >
                    <span className="text-sm font-medium">{item.title}</span>
                    {item.body ? (
                      <span className="text-muted-foreground line-clamp-2 text-xs">
                        {item.body}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <ModeToggle />
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="hover:bg-muted/70 h-10 gap-2 rounded-xl px-2"
                  aria-label="Account menu"
                />
              }
            >
              <Avatar className="ring-primary/25 size-8 ring-2">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
                {user.name}
              </span>
              <ChevronDownIcon className="text-muted-foreground hidden size-3.5 sm:inline" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-64 rounded-xl p-1.5 shadow-lift"
            >
              <div className="px-2.5 py-2.5">
                <p className="truncate text-sm font-semibold tracking-tight">
                  {user.name}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {user.email}
                </p>
                <Badge variant="secondary" className="mt-2">
                  {user.role}
                </Badge>
              </div>
              <DropdownMenuSeparator className="mx-1" />
              <DropdownMenuItem
                variant="destructive"
                className="rounded-lg px-2.5 py-2 text-sm"
                onClick={() => void handleLogout()}
              >
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
