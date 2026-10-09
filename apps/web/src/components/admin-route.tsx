import { Navigate, Outlet } from "react-router";

import { ServiceUnavailableScreen } from "@/components/auth/service-unavailable";
import Loader from "@/components/loader";
import { getAccessToken } from "@/lib/api";
import { homePathForRole, useAuthStore } from "@/stores/auth-store";

/** Client-side Admin gate — Nest `@Roles("Admin")` enforces API access. */
export default function AdminRoute() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const serviceUnavailable = useAuthStore((s) => s.serviceUnavailable);

  if (!isHydrated) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader />
      </div>
    );
  }

  const verified = Boolean(isAuthenticated && user && getAccessToken());

  if (verified) {
    if (user.role !== "Admin") {
      return <Navigate to={homePathForRole(user.role)} replace />;
    }
    return <Outlet />;
  }

  if (serviceUnavailable) {
    return <ServiceUnavailableScreen />;
  }

  return <Navigate to="/login" replace />;
}
