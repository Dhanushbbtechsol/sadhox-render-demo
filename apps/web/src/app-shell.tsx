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
          <main className="bg-muted flex-1 overflow-y-auto">
            <div className="flex min-h-full gap-4 p-4 md:gap-5 md:p-5 lg:gap-6 lg:p-6">
              <div className="bg-card ring-border/60 min-w-0 flex-1 space-y-6 rounded-2xl p-5 shadow-soft ring-1 md:p-6 lg:p-7">
                <AppBreadcrumbs />
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
      <Toaster richColors />
    </ThemeProvider>
  );
}
