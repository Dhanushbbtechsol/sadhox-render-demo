import { Navigate, Outlet } from "react-router";

import Loader from "@/components/loader";
import { homePathForRole, useAuthStore } from "@/stores/auth-store";

/** Client-side Admin gate — Nest `@Roles("Admin")` enforces API access. */
export default function AdminRoute() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  if (!isHydrated) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!user || user.role !== "Admin") {
    return <Navigate to={user ? homePathForRole(user.role) : "/login"} replace />;
  }

  return <Outlet />;
}
