import { Navigate, Outlet, useLocation } from "react-router";
import { useEffect, type ReactNode } from "react";

import { ServiceUnavailableScreen } from "@/components/auth/service-unavailable";
import Loader from "@/components/loader";
import { getAccessToken } from "@/lib/api";
import { homePathForRole, useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types/itsm";

function hasVerifiedSession(
  isAuthenticated: boolean,
  user: { role: UserRole } | null,
): boolean {
  return Boolean(isAuthenticated && user && getAccessToken());
}

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const location = useLocation();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const serviceUnavailable = useAuthStore((s) => s.serviceUnavailable);
  const verified = hasVerifiedSession(isAuthenticated, user);

  if (!isHydrated) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Fresh login/refresh wins — don't keep the outage gate after the API is back.
  if (verified) {
    if (roles && user && !roles.includes(user.role)) {
      return <Navigate to={homePathForRole(user.role)} replace />;
    }
    return <Outlet />;
  }

  if (serviceUnavailable) {
    return <ServiceUnavailableScreen />;
  }

  // Signed-out visitors at the front door see the product landing page.
  if (location.pathname === "/") {
    return <Navigate to="/welcome" replace />;
  }

  return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

export function GuestRoute() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const serviceUnavailable = useAuthStore((s) => s.serviceUnavailable);

  // Drop a stale outage flag so login → app isn't blocked after Docker is back.
  useEffect(() => {
    if (serviceUnavailable) {
      useAuthStore.setState({ serviceUnavailable: false });
    }
  }, [serviceUnavailable]);

  if (!isHydrated) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (hasVerifiedSession(isAuthenticated, user) && user) {
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
