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
        <p className="text-medical-600 font-medium">Paciente no encontrado</p>
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
            <div className="flex items-center gap-2 text-sm text-medical-500">
              <Link href="/patients" className="hover:text-medical-700">
                Pacientes
              </Link>
              <span>/</span>
              <span className="font-medium text-medical-800">
                {patient.full_name}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-medical-900">
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
          <Card className="border-medical-200/60 shadow-sm">
            <CardBody className="p-6 flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-medical-100 flex items-center justify-center text-medical-700 text-3xl font-bold border-2 border-medical-200 mb-4">
                {patient.first_name[0]}
                {patient.last_name[0]}
              </div>
              <h2 className="text-xl font-bold text-medical-900">
                {patient.full_name}
              </h2>
              <div className="mt-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-medical-50 text-medical-600 border border-medical-100 uppercase tracking-wider">
                ID: PAC-2024-{String(patient.id).padStart(3, "0")}
              </div>

              <div className="w-full mt-6 space-y-4 text-left border-t border-medical-100 pt-6">
                <div className="flex items-start gap-3 text-sm text-medical-600">
                  <div className="bg-medical-50 p-2 rounded-lg text-medical-500 mt-0.5">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs text-medical-400 font-medium">
                        DNI
                      </p>
                      <p className="font-semibold">{patient.dni || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-medical-400 font-medium">
                        CUIT/CUIL
                      </p>
                      <p className="text-sm text-medical-600">
                        {patient.cuit || "No registrado"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-medical-600">
                  <div className="bg-medical-50 p-2 rounded-lg text-medical-500">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-medical-400 font-medium">
                      Fecha de Nacimiento
                    </p>
                    <p className="font-semibold">
                      {patient.birth_date
                        ? formatDate(patient.birth_date)
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-medical-600">
                  <div className="bg-medical-50 p-2 rounded-lg text-medical-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-medical-400 font-medium">
                      Teléfono
                    </p>
                    <p className="font-semibold">
                      {formatPhone(patient.phone)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-medical-600">
                  <div className="bg-medical-50 p-2 rounded-lg text-medical-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-medical-400 font-medium">
                      Email
                    </p>
                    <p className="font-semibold truncate max-w-[180px]">
                      {patient.email || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-medical-600">
                  <div className="bg-medical-50 p-2 rounded-lg text-medical-500">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-medical-400 font-medium">
                      Dirección
                    </p>
                    <p className="font-semibold">
                      {patient.full_address || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-medical-600">
                  <div className="bg-medical-50 p-2 rounded-lg text-medical-500">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-medical-400 font-medium">
                      Obra Social
                    </p>
                    <p className="font-semibold">
                      {patient.insurance_provider || "Particular"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full mt-6 pt-6 border-t border-medical-100">
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
          <Card className="border-medical-200/60 shadow-sm">
            <CardHeader className="p-1 border-b border-medical-100 bg-white">
              <div className="flex">
                {isDoctor && (
                  <button
                    onClick={() => setActiveTab("historial")}
                    className={`px-6 py-4 text-sm font-bold transition-colors ${
                      activeTab === "historial"
                        ? "border-b-2 border-medical-600 text-medical-900 bg-medical-50/50"
                        : "text-medical-400 hover:text-medical-600"
                    }`}
                  >
                    Historial Clínico
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("turnos")}
                  className={`px-6 py-4 text-sm font-bold transition-colors ${
                    activeTab === "turnos"
                      ? "border-b-2 border-medical-600 text-medical-900 bg-medical-50/50"
                      : "text-medical-400 hover:text-medical-600"
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
                    <h3 className="font-bold text-medical-800 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-medical-500" />
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
                    <div className="relative pl-8 space-y-12 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-medical-100">
                      <div className="relative">
                        <div className="absolute -left-[2.15rem] top-1 h-7 w-7 rounded-full bg-medical-100 border-4 border-white flex items-center justify-center">
                          <Clock className="h-3 w-3 text-medical-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-medical-500 uppercase">
                            Sin registros aún
                          </p>
                          <h4 className="text-md font-bold text-medical-900 mt-1">
                            El historial del paciente está vacío
                          </h4>
                          <p className="text-sm text-medical-600 mt-2 bg-white p-4 rounded-xl border border-dashed border-medical-200">
                            Comienza registrando la primera consulta o estudio
                            realizado por el paciente.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-medical-100">
                      {recordsData.data.map((record) => (
                        <div key={record.id} className="relative">
                          <div className="absolute -left-[2.15rem] top-1 h-7 w-7 rounded-full bg-medical-100 border-4 border-white flex items-center justify-center">
                            <Stethoscope className="h-3 w-3 text-medical-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-medical-500 uppercase">
                              {formatLocalDate(
                                record.date || record.created_at,
                              )}
                            </p>
                            <h4 className="text-md font-bold text-medical-900 mt-1">
                              Consulta
                              {record.doctor
                                ? ` — Dr. ${record.doctor.name}`
                                : ""}
                            </h4>
                            <p className="text-sm text-medical-600 mt-2 bg-white p-4 rounded-xl border border-medical-100 line-clamp-3 overflow-hidden">
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
                              <p className="text-xs text-medical-400 mt-2">
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
                      <div className="bg-medical-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Calendar className="h-6 w-6 text-medical-300" />
                      </div>
                      <p className="text-sm font-medium text-medical-600">
                        No hay turnos programados
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-medical-500 hover:text-medical-700"
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
                            className="flex items-center justify-between p-4 rounded-xl border border-medical-100 hover:bg-medical-50/30 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-medical-50 p-2.5 rounded-lg">
                                <Calendar className="h-4 w-4 text-medical-500" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-medical-900">
                                  {formatLocalDate(apt.scheduled_start_at)}{" "}
                                  <span className="text-medical-500 font-normal">
                                    {formatLocalTime(apt.scheduled_start_at)} –{" "}
                                    {formatLocalTime(apt.scheduled_end_at)}
                                  </span>
                                </p>
                                <p className="text-xs text-medical-500 mt-0.5">
                                  {apt.doctor ? `Dr. ${apt.doctor.name}` : ""}
                                  {apt.service ? ` · ${apt.service.name}` : ""}
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
