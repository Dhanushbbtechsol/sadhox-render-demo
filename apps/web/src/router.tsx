import { createBrowserRouter } from "react-router";

import AppShell from "./app-shell";
import { RequireAuth, RequireRoles } from "./components/auth/protected-route";
import Home from "./routes/home";
import LoginPage from "./routes/login";
import CatalogPage from "./routes/catalog";
import RequestsPage from "./routes/requests";
import ChangesPage from "./routes/changes";
import ApprovalsPage from "./routes/approvals";

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
      { path: "login", element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: "catalog", element: <CatalogPage /> },
          { path: "requests", element: <RequestsPage /> },
          {
            element: <RequireRoles roles={["Agent", "Admin"]} />,
            children: [{ path: "changes", element: <ChangesPage /> }],
          },
          {
            element: <RequireRoles roles={["Admin"]} />,
            children: [{ path: "approvals", element: <ApprovalsPage /> }],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
