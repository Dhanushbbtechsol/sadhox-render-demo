import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import { useNavigate } from "react-router";

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
import { useAuthStore } from "@/stores/auth-store";

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

  async function handleLogout() {
    await logout();
    void navigate("/login", { replace: true });
  }

  return (
    <header className="border-border/80 flex h-18 items-center justify-between gap-4 border-b bg-white px-4 md:px-6">
      <div>
        <p className="text-foreground text-sm font-medium tracking-tight">IT Service Management</p>
        <p className="text-muted-foreground hidden text-xs sm:block">
          Track, prioritize, and resolve tickets
        </p>
      </div>
      <div className="flex items-center gap-2">
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
                <p className="truncate text-sm font-semibold tracking-tight">{user.name}</p>
                <p className="text-muted-foreground truncate text-xs">{user.email}</p>
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
