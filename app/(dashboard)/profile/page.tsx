"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { DoctorAvailabilityForm } from "@/components/features/DoctorAvailabilityForm";
import { Card, CardBody } from "@/components/ui/card";
import { User, Clock } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export default function ProfilePage() {
  const { user, hasRole } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const isDoctor = hasRole("doctor");

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-sm text-muted mt-1">
          Gestiona tu información personal y configuraciones.
        </p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardBody className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xl border-2 border-brand-200 shrink-0">
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              {(user as any).roles?.map((r: { name: string }) => (
                <span
                  key={r.name}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700 border border-brand-200"
                >
                  <User className="w-3 h-3 mr-1" />
                  {r.name === "clinic_manager"
                    ? "Dirección"
                    : r.name === "doctor"
                      ? "Doctor"
                      : r.name === "receptionist"
                        ? "Recepcionista"
                        : r.name}
                </span>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Doctor Availability — only shown for doctors */}
      {isDoctor && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Mi Disponibilidad Horaria
            </h2>
          </div>
          <p className="text-sm text-muted">
            Configura los días y horarios en que estás disponible para recibir turnos.
            Esta información es utilizada por la recepción al agendar consultas.
          </p>
          <DoctorAvailabilityForm
            doctorId={user.id}
            doctorName={user.name}
          />
        </div>
      )}
    </div>
  );
}
