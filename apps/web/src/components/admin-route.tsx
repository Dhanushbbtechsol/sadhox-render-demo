import { Navigate, Outlet } from "react-router";

import { ROLE_HOME, useAuthStore } from "@/stores/auth-store";

export default function AdminRoute() {
  const role = useAuthStore((state) => state.role);

  if (role !== "Admin") {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  return <Outlet />;
}
