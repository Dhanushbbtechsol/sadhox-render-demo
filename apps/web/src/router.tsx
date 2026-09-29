import { createBrowserRouter } from "react-router";

import AppShell from "./app-shell";
import { GuestRoute, ProtectedRoute } from "@/components/auth/protected-route";
import AuditLogsPage from "@/features/admin/audit-logs-page";
import DashboardPage from "@/features/admin/dashboard-page";
import AssetRegisterPage from "@/features/assets/asset-register-page";
import CatalogPage from "@/routes/catalog";
import IncidentDetailPage from "@/routes/incident-detail";
import IncidentsPage from "@/routes/incidents";
import LoginPage from "@/routes/login";
import PortalPage from "@/routes/portal";
import ProblemsPage from "@/routes/problems";
import RequestsPage from "@/routes/requests";
import RoleHomeRedirect from "@/routes/role-home";

function NotFound() {
  return (
    <main className="space-y-2">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="text-muted-foreground text-sm">The requested page could not be found.</p>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
    ],
  },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        handle: { breadcrumb: "Home" },
        children: [
          {
            index: true,
            element: <RoleHomeRedirect />,
          },
          {
            path: "admin/dashboard",
            handle: { breadcrumb: "Dashboard" },
            element: <ProtectedRoute roles={["Admin"]} />,
            children: [{ index: true, element: <DashboardPage /> }],
          },
          {
            path: "assets",
            handle: { breadcrumb: "Assets" },
            element: <ProtectedRoute roles={["Admin"]} />,
            children: [{ index: true, element: <AssetRegisterPage /> }],
          },
          {
            path: "admin/audit-logs",
            handle: { breadcrumb: "Audit logs" },
            element: <ProtectedRoute roles={["Admin"]} />,
            children: [{ index: true, element: <AuditLogsPage /> }],
          },
          {
            path: "incidents",
            handle: { breadcrumb: "Incidents" },
            element: <ProtectedRoute roles={["Admin", "Agent"]} />,
            children: [
              { index: true, element: <IncidentsPage /> },
              {
                path: ":id",
                element: <IncidentDetailPage />,
                handle: { breadcrumb: "Detail" },
              },
            ],
          },
          {
            path: "problems",
            handle: { breadcrumb: "Problems" },
            element: <ProtectedRoute roles={["Admin", "Agent"]} />,
            children: [{ index: true, element: <ProblemsPage /> }],
          },
          {
            path: "portal",
            handle: { breadcrumb: "Portal" },
            element: <ProtectedRoute roles={["EndUser", "Admin"]} />,
            children: [{ index: true, element: <PortalPage /> }],
          },
          {
            path: "catalog",
            handle: { breadcrumb: "Catalog" },
            element: <ProtectedRoute roles={["Admin", "Agent", "EndUser"]} />,
            children: [{ index: true, element: <CatalogPage /> }],
          },
          {
            path: "requests",
            handle: { breadcrumb: "Requests" },
            element: <ProtectedRoute roles={["Admin", "Agent", "EndUser"]} />,
            children: [{ index: true, element: <RequestsPage /> }],
          },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);
