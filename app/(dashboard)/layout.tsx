"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { FullPageSpinner } from "@/components/ui/spinner";
import { toast } from "sonner";

// Routes that require the doctor role (PHI / medical records).
// Pattern: /patients/<id>/medical-records (and any sub-path).
const DOCTOR_ONLY_ROUTE_PATTERN = /\/patients\/[^/]+\/medical-records/;

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

  // ── Doctor-only route guard (medical records) ─────────────────────────
  // Block receptionist / clinic_manager from accessing HC routes directly.
  const isDoctorOnlyRoute = DOCTOR_ONLY_ROUTE_PATTERN.test(pathname);
  const shouldBlockNonDoctor =
    !isLoading && isAuthenticated && isDoctorOnlyRoute && !hasRole("doctor");

  useEffect(() => {
    if (shouldBlockNonDoctor) {
      toast.error("Acceso denegado: Privacidad de datos médicos.");
      router.replace("/dashboard");
    }
  }, [shouldBlockNonDoctor, router]);

  // ── Render guards (synchronous — blocks children before mount) ─────────
  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <FullPageSpinner />;
  }

  // Block non-doctors from medical records routes (synchronous).
  if (shouldBlockNonDoctor) {
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
