import { Navigate, Outlet, useLocation } from "react-router";
import type { ReactNode } from "react";

import Loader from "@/components/loader";
import { homePathForRole, useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types/itsm";

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

/** @deprecated Prefer ProtectedRoute — kept for catalog/change role gates. */
export function RequireAuth() {
  return <ProtectedRoute />;
}

/** @deprecated Prefer ProtectedRoute roles=… */
export function RequireRoles({ roles }: { roles: UserRole[] }) {
  return <ProtectedRoute roles={roles} />;
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
