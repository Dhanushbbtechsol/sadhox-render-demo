import { createBrowserRouter } from "react-router";

import AdminRoute from "./components/admin-route";
import AppShell from "./app-shell";
import AdminLayout from "./features/admin/admin-layout";
import AuditLogsPage from "./features/admin/audit-logs-page";
import DashboardPage from "./features/admin/dashboard-page";
import AssetRegisterPage from "./features/assets/asset-register-page";
import Home from "./routes/home";

function NotFound() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="text-muted-foreground">The requested page could not be found.</p>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      {
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: "admin/dashboard", element: <DashboardPage /> },
              { path: "assets", element: <AssetRegisterPage /> },
              { path: "admin/audit-logs", element: <AuditLogsPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
