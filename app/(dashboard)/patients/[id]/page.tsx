"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getPatient, deletePatient } from "@/services/patients";
import { getMedicalRecords } from "@/services/medical-records";
import { getAppointments } from "@/services/appointments";
import {
  formatLocalDate,
  formatLocalTime,
  formatLocalDateTime,
} from "@/lib/timezone";
import { useAuth } from "@/contexts/auth-context";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
  MessageSquare,
  ClipboardList,
  Clock,
  Plus,
  Stethoscope,
  CreditCard,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";
import { formatPhone } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppointmentStatusBadge } from "@/components/ui/appointment-status-badge";

export default function PatientDetailPage() {
  const queryClient = useQueryClient();
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const isDoctor = hasRole("doctor");
  const id = Number(params.id);
  const [activeTab, setActiveTab] = useState<"historial" | "turnos">(
    isDoctor ? "historial" : "turnos",
  );

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient(id),
  });

  const { data: recordsData, isLoading: loadingRecords } = useQuery({
    queryKey: ["medical-records", id],
    queryFn: () => getMedicalRecords({ patient_id: id, cantidad: 50 }),
    enabled: !!patient && isDoctor,
  });

  const { data: appointmentsData, isLoading: loadingAppointments } = useQuery({
    queryKey: ["appointments", id],
    queryFn: () => getAppointments({ patient_id: id, cantidad: 50 }),
    enabled: !!patient,
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente archivado correctamente");
      router.push("/patients");
    },
    onError: () => {
      toast.error("Error al archivar el paciente");
    },
  });

  const handleArchive = () => {
    if (
      confirm(
        "¿Está seguro de que desea archivar (soft delete) a este paciente? Esta acción puede afectar a los turnos futuros.",
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground font-medium">
          Paciente no encontrado
        </p>
        <Link href="/patients" className="mt-4 inline-block">
          <Button variant="outline">Volver al listado</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header / Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-sm text-brand-500">
              <Link href="/patients" className="hover:text-brand-700">
                Pacientes
              </Link>
              <span>/</span>
              <span className="font-medium text-brand-800">
                {patient.full_name}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-brand-900">
              {patient.full_name}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          {hasRole("clinic_manager") && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={handleArchive}
              disabled={deleteMutation.isPending}
            >
              Archivar Paciente
            </Button>
          )}
          <Link href={`/patients/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Editar Datos
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-brand-200/60 shadow-sm">
            <CardBody className="p-6 flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-3xl font-bold border-2 border-brand-200 mb-4">
                {patient.first_name[0]}
                {patient.last_name[0]}
              </div>
              <h2 className="text-xl font-bold text-brand-900">
                {patient.full_name}
              </h2>
              <div className="mt-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 border border-brand-100 uppercase tracking-wider">
                ID: PAC-2024-{String(patient.id).padStart(3, "0")}
              </div>

              <div className="w-full mt-6 space-y-4 text-left border-t border-brand-100 pt-6">
                <div className="flex items-start gap-3 text-sm text-foreground">
                  <div className="bg-surface-secondary p-2 rounded-lg text-muted-foreground mt-0.5">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        DNI
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {patient.dni || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        CUIT/CUIL
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {patient.cuit || "No registrado"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <div className="bg-surface-secondary p-2 rounded-lg text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Fecha de Nacimiento
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {patient.birth_date
                        ? formatDate(patient.birth_date)
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <div className="bg-surface-secondary p-2 rounded-lg text-muted-foreground">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Teléfono
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatPhone(patient.phone)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <div className="bg-surface-secondary p-2 rounded-lg text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                      {patient.email || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <div className="bg-surface-secondary p-2 rounded-lg text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Dirección
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {patient.full_address || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <div className="bg-surface-secondary p-2 rounded-lg text-muted-foreground">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Obra Social
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {patient.insurance_provider || "Particular"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full mt-6 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar WhatsApp
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Main Content (History & Appointments) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-brand-200/60 shadow-sm">
            <CardHeader className="p-1 border-b border-brand-100 bg-surface">
              <div className="flex">
                {isDoctor && (
                  <button
                    onClick={() => setActiveTab("historial")}
                    className={`px-6 py-4 text-sm font-bold transition-colors ${
                      activeTab === "historial"
                        ? "border-b-2 border-brand-600 text-brand-900 bg-brand-50/50"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Historial Clínico
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("turnos")}
                  className={`px-6 py-4 text-sm font-bold transition-colors ${
                    activeTab === "turnos"
                      ? "border-b-2 border-brand-600 text-brand-900 bg-brand-50/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Turnos
                </button>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              {isDoctor && activeTab === "historial" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-muted-foreground" />
                      Registros Médicos
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/patients/${id}/medical-records/new`)
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Registro
                    </Button>
                  </div>

                  {loadingRecords ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : !recordsData?.data?.length ? (
                    <div className="relative pl-8 space-y-12 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                      <div className="relative">
                        <div className="absolute -left-[2.15rem] top-1 h-7 w-7 rounded-full bg-surface-secondary border-4 border-surface flex items-center justify-center">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Sin registros aún
                          </p>
                          <h4 className="text-base font-semibold text-foreground mt-1">
                            El historial del paciente está vacío
                          </h4>
                          <p className="text-sm text-foreground/90 leading-relaxed mt-2 bg-surface p-4 rounded-xl border border-dashed border-border">
                            Comienza registrando la primera consulta o estudio
                            realizado por el paciente.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                      {recordsData.data.map((record) => (
                        <div key={record.id} className="relative">
                          <div className="absolute -left-[2.15rem] top-1 h-7 w-7 rounded-full bg-surface-secondary border-4 border-surface flex items-center justify-center">
                            <Stethoscope className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {formatLocalDate(
                                record.date || record.created_at,
                              )}
                            </p>
                            <h4 className="text-base font-semibold text-foreground mt-1">
                              Consulta
                              {record.doctor
                                ? ` — Dr. ${record.doctor.name}`
                                : ""}
                            </h4>
                            <p className="text-sm text-foreground/90 leading-relaxed mt-2 bg-surface p-4 rounded-xl border border-border line-clamp-3 overflow-hidden">
                              {record.content}
                            </p>
                            <Link
                              href={`/patients/${id}/medical-records/${record.id}`}
                              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
                            >
                              <Eye className="w-4 h-4" />
                              Ver registro completo
                            </Link>

                            {record.appointment?.service && (
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">
                                Servicio: {record.appointment.service.name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "turnos" && (
                <div className="space-y-4">
                  {loadingAppointments ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : !appointmentsData?.data?.length ? (
                    <div className="text-center py-8">
                      <div className="bg-surface-secondary w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        No hay turnos programados
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push("/calendar")}
                      >
                        Agendar ahora
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appointmentsData.data.map((apt: any) => {
                        return (
                          <div
                            key={apt.id}
                            className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-surface-secondary/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-surface-secondary p-2.5 rounded-lg">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {formatLocalDate(apt.scheduled_start_at)}{" "}
                                  <span className="text-muted-foreground font-medium">
                                    {formatLocalTime(apt.scheduled_start_at)} –{" "}
                                    {formatLocalTime(apt.scheduled_end_at)}
                                  </span>
                                </p>
                                <p className="text-xs font-medium text-foreground/80 mt-0.5 capitalize">
                                  {apt.doctor
                                    ? `Dr. ${apt.doctor.name.toLowerCase()}`
                                    : ""}
                                  {apt.service
                                    ? ` · ${apt.service.name.toLowerCase()}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <AppointmentStatusBadge status={apt.status} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
