import { Navigate } from "react-router";

import { homePathForRole, useAuthStore } from "@/stores/auth-store";
import Loader from "@/components/loader";

export default function RoleHomeRedirect() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated || !user) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return <Navigate to={homePathForRole(user.role)} replace />;
}
