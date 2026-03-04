"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  User,
  ClipboardList,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getMedicalRecord } from "@/services/medical-records";
import { formatLocalDate } from "@/lib/timezone";
import { Suspense } from "react";

function ReadOnlyMedicalRecordContent() {
  const params = useParams();
  const router = useRouter();

  const patientId = Number(params.id);
  const recordId = Number(params.record_id);

  const { data: record, isLoading } = useQuery({
    queryKey: ["medical-record", recordId],
    queryFn: () => getMedicalRecord(recordId),
    enabled: !!recordId,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-64">
        <ClipboardList className="h-12 w-12 text-brand-300 mb-4" />
        <h2 className="text-xl font-bold text-foreground">
          Registro Médico no encontrado
        </h2>
        <p className="text-muted mt-2">
          El registro médico que intentas acceder no existe o no está
          disponible.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push(`/patients/${patientId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al paciente
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 p-2"
            onClick={() => router.push(`/patients/${patientId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al perfil
          </Button>
        </div>
        <div className="bg-success/10 text-success px-3 py-1 rounded-full text-xs font-semibold border border-success/20">
          Registro Finalizado
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Context Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-brand-200 shadow-sm bg-surface-secondary/50">
            <CardHeader className="pb-3 border-b border-brand-100">
              <CardTitle className="text-sm font-semibold text-brand-800 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-brand-500" />
                Detalles del Registro
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4 space-y-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-brand-400 font-medium uppercase tracking-wider">
                  Fecha de la Evolución
                </span>
                <div className="flex items-center gap-2 font-semibold text-brand-900">
                  <Calendar className="w-4 h-4 text-brand-500" />
                  {formatLocalDate(record.date)}
                </div>
              </div>

              <div className="space-y-1 pt-3 border-t border-brand-100">
                <span className="text-xs text-brand-400 font-medium uppercase tracking-wider">
                  Paciente
                </span>
                <div className="flex items-center gap-2 font-medium text-brand-800">
                  <User className="w-4 h-4 text-brand-500" />
                  {record.patient?.full_name || "Desconocido"}
                </div>
              </div>

              <div className="space-y-1 pt-3 border-t border-brand-100">
                <span className="text-xs text-brand-400 font-medium uppercase tracking-wider">
                  Profesional
                </span>
                <div className="flex items-center gap-2 font-medium text-brand-800">
                  <Stethoscope className="w-4 h-4 text-brand-500" />
                  {record.doctor ? `Dr. ${record.doctor.name}` : "Sistema"}
                </div>
              </div>

              {record.appointment?.service && (
                <div className="space-y-1 pt-3 border-t border-brand-100">
                  <span className="text-xs text-brand-400 font-medium uppercase tracking-wider">
                    Servicio Vinculado
                  </span>
                  <div className="font-medium text-brand-800">
                    {record.appointment.service.name}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Clinical Content */}
        <div className="lg:col-span-2">
          <Card className="border-brand-200 shadow-sm h-full">
            <CardHeader className="border-b border-brand-100 bg-surface">
              <CardTitle className="text-lg font-bold text-brand-900 flex items-center gap-2">
                Evolución Médica
              </CardTitle>
            </CardHeader>
            <CardBody className="p-8 bg-surface min-h-[400px]">
              <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
                {record.content}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ReadOnlyMedicalRecordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <ReadOnlyMedicalRecordContent />
    </Suspense>
  );
}
