import { useState } from "react";
import { Outlet } from "react-router";

import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      storageKey="vite-ui-theme"
    >
      <div className="bg-background flex h-svh overflow-hidden">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNavbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <AppBreadcrumbs />
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster richColors />
    </ThemeProvider>
  );
}
