import { Navigate, Outlet, useLocation } from "react-router";
import type { ReactNode } from "react";

import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types/api";

export function RequireAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RequireRoles({ roles }: { roles: UserRole[] }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/catalog" replace />;
  }

  return <Outlet />;
}

export function Can({
  roles,
  children,
  fallback = null,
}: {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hasRole = useAuthStore((state) => state.hasRole);
  return hasRole(...roles) ? children : fallback;
}

export function useCan(...roles: UserRole[]) {
  return useAuthStore((state) => state.hasRole(...roles));
}
