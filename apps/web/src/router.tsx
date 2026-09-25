import { createBrowserRouter } from "react-router";

import AppShell from "./app-shell";
import { GuestRoute, ProtectedRoute } from "@/components/auth/protected-route";
import IncidentDetailPage from "@/routes/incident-detail";
import IncidentsPage from "@/routes/incidents";
import LoginPage from "@/routes/login";
import PortalPage from "@/routes/portal";
import ProblemsPage from "@/routes/problems";
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
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);
