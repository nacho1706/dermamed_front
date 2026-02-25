"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { FullPageSpinner } from "@/components/ui/spinner";

// Whitelist of routes accessible to system_admin.
// Everything NOT in this list is blocked for system_admin.
// Add shared routes (e.g. /profile, /settings) here if created in the future.
const SYSTEM_ADMIN_ALLOWED_ROUTES = ["/admin-dashboard", "/users"];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Auth redirect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // ── Whitelist guard for system_admin ───────────────────────────────────
  // Whitelist approach: if the user is system_admin and the current route is
  // NOT in the allowed list, block and redirect to /admin-dashboard.
  // This is safer than a blacklist (PHI_ROUTES), as any new clinical route
  // added in the future is protected by default.
  const isSystemAdmin =
    !isLoading && isAuthenticated && hasRole("system_admin");
  const isAllowedForAdmin = SYSTEM_ADMIN_ALLOWED_ROUTES.some((r) =>
    pathname.startsWith(r),
  );
  const shouldBlockSystemAdmin = isSystemAdmin && !isAllowedForAdmin;

  // Fire redirect via effect (children are already blocked below)
  useEffect(() => {
    if (shouldBlockSystemAdmin) {
      router.replace("/admin-dashboard");
    }
  }, [shouldBlockSystemAdmin, router]);

  // ── Render guards (synchronous — blocks children before mount) ─────────
  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <FullPageSpinner />;
  }

  // CRITICAL: Return spinner synchronously to prevent FOUC/PHI leak.
  // Children are NEVER mounted for a blocked route.
  if (shouldBlockSystemAdmin) {
    return <FullPageSpinner />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-secondary">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto bg-surface relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
