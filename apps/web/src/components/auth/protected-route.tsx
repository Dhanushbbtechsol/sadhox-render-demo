import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import { homePathForRole, useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types/itsm";
import Loader from "@/components/loader";

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const location = useLocation();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isHydrated) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <Outlet />;
}

/** UI-only role gate for buttons/sections. API must still enforce RBAC. */
export function Can({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const hasRole = useAuthStore((s) => s.hasRole);
  if (!hasRole(...roles)) return null;
  return children;
}

export function GuestRoute() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isHydrated) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <Outlet />;
}
