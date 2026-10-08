import { Navigate, useParams } from "react-router";

/** Phase 7: /portal → /incidents */
export function PortalIndexRedirect() {
  return <Navigate to="/incidents" replace />;
}

/** Phase 7: /portal/incidents/:id → /incidents/:id */
export function PortalIncidentRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/incidents/${id}` : "/incidents"} replace />;
}
