"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Monitor, UserCog, Settings, FileText } from "lucide-react";

export default function AdminDashboardPage() {
  const { user, hasRole } = useAuth();
  const router = useRouter();

  // Guard: only system_admin can access this page
  React.useEffect(() => {
    if (!hasRole("system_admin")) {
      router.replace("/dashboard");
    }
  }, [hasRole, router]);

  if (!hasRole("system_admin")) return null;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1200px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Dashboard Técnico
        </h1>
        <p className="text-sm text-muted mt-1">
          Bienvenido, {user?.name}. Panel de administración del sistema
          DermaMED.
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)]">
        <p className="text-sm text-amber-800 font-medium">
          🔒 Acceso restringido por política de privacidad
        </p>
        <p className="text-xs text-amber-700 mt-1">
          Como administrador del sistema, no tienes acceso a datos clínicos de
          pacientes (PHI). Este panel está diseñado exclusivamente para
          configuración técnica y monitoreo.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-[var(--shadow-md)] transition-all duration-200">
          <CardBody className="flex flex-col items-start gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-brand-50 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Estado del Sistema
              </h3>
              <p className="text-xs text-muted mt-1">
                Monitoreo de salud del servidor y métricas técnicas.
              </p>
            </div>
            <span className="text-xs font-medium text-muted bg-surface-secondary px-2 py-1 rounded-full">
              Próximamente
            </span>
          </CardBody>
        </Card>

        <Card className="hover:shadow-[var(--shadow-md)] transition-all duration-200">
          <CardBody className="flex flex-col items-start gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-indigo-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Logs del Sistema
              </h3>
              <p className="text-xs text-muted mt-1">
                Registro de actividad, errores y auditoría.
              </p>
            </div>
            <span className="text-xs font-medium text-muted bg-surface-secondary px-2 py-1 rounded-full">
              Próximamente
            </span>
          </CardBody>
        </Card>

        <Card className="hover:shadow-[var(--shadow-md)] transition-all duration-200">
          <CardBody className="flex flex-col items-start gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-purple-50 flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Configuraciones Globales
              </h3>
              <p className="text-xs text-muted mt-1">
                Ajustes generales del sistema y parámetros.
              </p>
            </div>
            <span className="text-xs font-medium text-muted bg-surface-secondary px-2 py-1 rounded-full">
              Próximamente
            </span>
          </CardBody>
        </Card>
      </div>

      {/* System Info */}
      <Card>
        <CardBody>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Información del Sistema
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-xs text-muted">Versión</span>
              <span className="text-xs font-medium text-foreground">
                v0.2 (MVP)
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-xs text-muted">Entorno</span>
              <span className="text-xs font-medium text-foreground">
                Desarrollo
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-xs text-muted">Frontend</span>
              <span className="text-xs font-medium text-foreground">
                Next.js 16
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-xs text-muted">Backend</span>
              <span className="text-xs font-medium text-foreground">
                Laravel 12
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
