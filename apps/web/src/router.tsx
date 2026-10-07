import { createBrowserRouter } from "react-router";

import AppShell from "./app-shell";
import { GuestRoute, ProtectedRoute } from "@/components/auth/protected-route";
import AuditLogsPage from "@/features/admin/audit-logs-page";
import DashboardPage from "@/features/admin/dashboard-page";
import QueueMonitorPage from "@/features/admin/queue-monitor-page";
import AdminCatalogPage from "@/features/admin/admin-catalog-page";
import SlaRulesPage from "@/features/admin/sla-rules-page";
import AssetRegisterPage from "@/features/assets/asset-register-page";
import KnowledgeArticlePage from "@/features/knowledge/knowledge-article-page";
import KnowledgeListPage from "@/features/knowledge/knowledge-list-page";
import ApprovalsPage from "@/routes/approvals";
import CatalogPage from "@/routes/catalog";
import ChangesPage from "@/routes/changes";
import IncidentDetailPage from "@/routes/incident-detail";
import IncidentsPage from "@/routes/incidents";
import KnowledgePage from "@/routes/knowledge";
import KnowledgeDetailPage from "@/routes/knowledge-detail";
import LoginPage from "@/routes/login";
import PortalPage from "@/routes/portal";
import PortalIncidentDetailPage from "@/routes/portal-incident-detail";
import ProblemsPage from "@/routes/problems";
import ProblemDetailPage from "@/routes/problem-detail";
import RequestsPage from "@/routes/requests";
import RequestDetailPage from "@/routes/request-detail";
import RoleHomeRedirect from "@/routes/role-home";
import ChangeDetailPage from "@/routes/change-detail";
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
            path: "admin/queues",
            handle: { breadcrumb: "Queues" },
            element: <ProtectedRoute roles={["Admin"]} />,
            children: [{ index: true, element: <QueueMonitorPage /> }],
          },
          {
            path: "admin/catalog",
            handle: { breadcrumb: "Catalog admin" },
            element: <ProtectedRoute roles={["Admin"]} />,
            children: [{ index: true, element: <AdminCatalogPage /> }],
          },
          {
            path: "admin/knowledge",
            handle: { breadcrumb: "Knowledge" },
            element: <ProtectedRoute roles={["Admin"]} />,
            children: [
              { index: true, element: <KnowledgeListPage /> },
              {
                path: "new",
                element: <KnowledgeArticlePage />,
                handle: { breadcrumb: "New" },
              },
              {
                path: ":id",
                element: <KnowledgeArticlePage />,
                handle: { breadcrumb: "Edit" },
              },
            ],
          },
          {
            path: "admin/sla-rules",
            handle: { breadcrumb: "SLA" },
            element: <ProtectedRoute roles={["Admin"]} />,
            children: [{ index: true, element: <SlaRulesPage /> }],
          },
          {
            path: "incidents",
            handle: { breadcrumb: "Incidents" },
            element: <ProtectedRoute roles={["Admin", "Agent", "Manager"]} />,
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
            element: <ProtectedRoute roles={["Admin", "Agent", "Manager"]} />,
            children: [
              { index: true, element: <ProblemsPage /> },
              {
                path: ":id",
                element: <ProblemDetailPage />,
                handle: { breadcrumb: "Detail" },
              },
            ],
          },
          {
            path: "portal",
            handle: { breadcrumb: "Portal" },
            element: <ProtectedRoute roles={["EndUser", "Admin"]} />,
            children: [
              { index: true, element: <PortalPage /> },
              {
                path: "incidents/:id",
                element: <PortalIncidentDetailPage />,
                handle: { breadcrumb: "Incident" },
              },
            ],
          },
          {
            path: "knowledge",
            handle: { breadcrumb: "Knowledge" },
            element: (
              <ProtectedRoute roles={["Admin", "Agent", "EndUser"]} />
            ),
            children: [
              { index: true, element: <KnowledgePage /> },
              {
                path: ":slug",
                element: <KnowledgeDetailPage />,
                handle: { breadcrumb: "Article" },
              },
            ],
          },
          {
            path: "catalog",
            handle: { breadcrumb: "Catalog" },
            element: (
              <ProtectedRoute
                roles={["Admin", "Agent", "EndUser", "Manager"]}
              />
            ),
            children: [{ index: true, element: <CatalogPage /> }],
          },
          {
            path: "requests",
            handle: { breadcrumb: "Requests" },
            element: (
              <ProtectedRoute roles={["Admin", "Agent", "EndUser", "Manager"]} />
            ),
            children: [
              { index: true, element: <RequestsPage /> },
              {
                path: ":id",
                element: <RequestDetailPage />,
                handle: { breadcrumb: "Detail" },
              },
            ],
          },
          {
            path: "changes",
            handle: { breadcrumb: "Changes" },
            element: <ProtectedRoute roles={["Admin", "Agent", "Manager"]} />,
            children: [
              { index: true, element: <ChangesPage /> },
              {
                path: ":id",
                element: <ChangeDetailPage />,
                handle: { breadcrumb: "Detail" },
              },
            ],
          },
          {
            path: "approvals",
            handle: { breadcrumb: "Approvals" },
            element: <ProtectedRoute roles={["Admin", "Manager"]} />,
            children: [{ index: true, element: <ApprovalsPage /> }],
          },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);
