import { useAuthStore } from "@/stores/auth-store";

import IncidentDetailPage from "./incident-detail";
import PortalIncidentDetailPage from "./portal-incident-detail";

/** EndUser gets the read-only portal detail; Agent/Admin/Manager get full desk controls. */
export default function IncidentDetailGate() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === "EndUser") {
    return <PortalIncidentDetailPage />;
  }
  return <IncidentDetailPage />;
}
