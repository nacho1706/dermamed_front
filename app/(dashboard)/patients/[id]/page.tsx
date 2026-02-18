"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { getPatient } from "@/services/patients";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  MessageSquare,
  ClipboardList,
  Clock,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

export default function PatientDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient(id),
  });

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
          <Link href={`/patients/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Editar Datos
            </Button>
          </Link>
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            Iniciar Consulta
          </Button>
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
                <div className="flex items-center gap-3 text-sm text-medical-600">
                  <div className="bg-medical-50 p-2 rounded-lg text-medical-500">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-medical-400 font-medium">
                      CUIT / DNI
                    </p>
                    <p className="font-semibold">{patient.cuit || "—"}</p>
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
                    <p className="font-semibold">{patient.phone || "—"}</p>
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

          {/* Admin Info Card */}
          <Card className="border-medical-200/60 shadow-sm">
            <CardHeader className="p-4 border-b border-medical-100 flex justify-between items-center bg-medical-50/30">
              <h3 className="text-sm font-bold text-medical-800">
                Resumen Administrativo
              </h3>
            </CardHeader>
            <CardBody className="p-4 space-y-4">
              <div className="flex justify-between items-center bg-medical-900 text-white p-4 rounded-xl">
                <div>
                  <p className="text-[10px] text-medical-300 font-bold uppercase tracking-wider">
                    Saldo Pendiente
                  </p>
                  <p className="text-xl font-bold">$ 0,00</p>
                </div>
                <Button
                  size="sm"
                  className="bg-medical-700 hover:bg-medical-600 text-xs"
                >
                  Pagar
                </Button>
              </div>
              <div>
                <p className="text-xs text-medical-500 mb-2">Obra Social</p>
                <div className="bg-medical-50 p-3 rounded-lg border border-medical-100">
                  <p className="text-sm font-bold text-medical-700">
                    {patient.insurance_provider || "Particular"}
                  </p>
                  <p className="text-[10px] text-medical-500">
                    Plan: Sin especificar
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Main Content (History & Appointments) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-medical-200/60 shadow-sm">
            <CardHeader className="p-1 border-b border-medical-100 bg-white">
              <div className="flex">
                <button className="px-6 py-4 text-sm font-bold border-b-2 border-medical-600 text-medical-900 bg-medical-50/50">
                  Historial Clínico
                </button>
                <button className="px-6 py-4 text-sm font-medium text-medical-400 hover:text-medical-600 transition-colors">
                  Turnos
                </button>
                <button className="px-6 py-4 text-sm font-medium text-medical-400 hover:text-medical-600 transition-colors">
                  Facturación
                </button>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              {/* History Placeholder (Phase 1.3) */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-medical-800 flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-medical-500" />
                    Registros Médicos
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.info("Funcionalidad disponible en Fase 1.3")
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Registro
                  </Button>
                </div>

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
              </div>
            </CardBody>
          </Card>

          {/* Appointments Placeholder (Phase 1.2) */}
          <Card className="border-medical-200/60 shadow-sm">
            <CardHeader className="p-4 border-b border-medical-100 bg-medical-50/30">
              <h3 className="text-sm font-bold text-medical-800">
                Próximos Turnos
              </h3>
            </CardHeader>
            <CardBody className="p-8 text-center bg-medical-50/10">
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
                onClick={() =>
                  toast.info("Funcionalidad disponible en Fase 1.2")
                }
              >
                Agendar ahora
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
