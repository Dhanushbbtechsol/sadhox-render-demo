import { LogOutIcon } from "lucide-react";
import { useNavigate } from "react-router";

import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <header className="border-border bg-background flex h-12 items-center justify-between gap-4 border-b px-4">
      <div className="text-muted-foreground text-xs">IT Service Management</div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        {user ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-1">
              <Avatar className="size-7">
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-medium">{user.name}</p>
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {user.role}
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleLogout()}
              aria-label="Sign out"
            >
              <LogOutIcon />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
