import { Navigate } from "react-router";

import Loader from "@/components/loader";
import { getAccessToken } from "@/lib/api";
import { homePathForRole, useAuthStore } from "@/stores/auth-store";

export default function RoleHomeRedirect() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const serviceUnavailable = useAuthStore((s) => s.serviceUnavailable);

  if (!isHydrated) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Outage with no live token → login form (not the unavailable gate).
  if (serviceUnavailable || !isAuthenticated || !user || !getAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={homePathForRole(user.role)} replace />;
}
