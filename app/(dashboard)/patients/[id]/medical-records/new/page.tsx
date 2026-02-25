"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Calendar,
  Clock,
  User,
  ClipboardList,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getPatient } from "@/services/patients";
import { createMedicalRecord } from "@/services/medical-records";
import { updateAppointment } from "@/services/appointments";
import { useAuth } from "@/contexts/auth-context";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const medicalRecordSchema = z.object({
  patient_id: z.number(),
  doctor_id: z.number(),
  date: z.string().min(1, "La fecha es requerida"),
  content: z.string().min(10, "El contenido debe tener al menos 10 caracteres"),
  appointment_id: z.number().optional().nullable(),
});

type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>;

import { Suspense } from "react";

function MedicalRecordFormContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const patientId = Number(params.id);
  const appointmentIdParam = searchParams.get("appointment_id");
  const appointmentId = appointmentIdParam ? Number(appointmentIdParam) : null;

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDiscardAlertOpen, setIsDiscardAlertOpen] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  const draftKey = appointmentId
    ? `draft_appointment_${appointmentId}`
    : `draft_manual_record_${patientId}`;

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId),
    enabled: !!patientId,
  });

  const form = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      patient_id: patientId,
      doctor_id: user?.id || 0,
      date: new Date().toISOString().split("T")[0],
      content: "",
      appointment_id: appointmentId,
    },
  });

  const createRecordMutation = useMutation({
    mutationFn: createMedicalRecord,
    onSuccess: async () => {
      localStorage.removeItem(draftKey);

      try {
        if (appointmentId) {
          await updateAppointment(appointmentId, { status: "completed" });
        }
      } catch (e) {
        console.error(
          "No se pudo marcar el turno como completado automáticamente",
          e,
        );
      }

      queryClient.invalidateQueries({
        queryKey: ["medical-records", patientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
      });
      toast.success("Registro creado", {
        description: "La evolución clínica ha sido guardada exitosamente.",
      });
      router.push(`/patients/${patientId}`);
    },
    onError: (error) => {
      toast.error("Error al guardar", {
        description: "Hubo un problema al crear el registro médico.",
      });
      console.error(error);
    },
  });

  useEffect(() => {
    if (user?.id) {
      form.setValue("doctor_id", user.id);
    }
  }, [user, form]);

  const contentValue = form.watch("content");

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      form.setValue("content", savedDraft, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [draftKey, form]);

  // Save draft on change
  useEffect(() => {
    if (contentValue) {
      localStorage.setItem(draftKey, contentValue);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [contentValue, draftKey]);

  const onSubmit = (data: MedicalRecordFormValues) => {
    createRecordMutation.mutate(data);
  };

  const handleCancelClick = () => {
    if (appointmentId) {
      setIsCancelModalOpen(true);
    } else {
      if (contentValue && contentValue.length > 0) {
        setIsDiscardAlertOpen(true);
      } else {
        router.push(`/patients/${patientId}`);
      }
    }
  };

  const handleConfirmDiscard = () => {
    localStorage.removeItem(draftKey);
    setIsDiscardAlertOpen(false);
    router.push(`/patients/${patientId}`);
  };

  const handleRevertTurno = async () => {
    if (!appointmentId) return;
    setIsReverting(true);
    try {
      await updateAppointment(appointmentId, { status: "in_waiting_room" });
      localStorage.removeItem(draftKey);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Turno revertido a Sala de Espera");
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Error al revertir el turno");
    } finally {
      setIsReverting(false);
    }
  };

  const handleJustExit = () => {
    localStorage.removeItem(draftKey);
    router.push("/dashboard");
  };

  if (patientLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-64">
        <User className="h-12 w-12 text-medical-300 mb-4" />
        <h2 className="text-xl font-bold text-medical-800">
          Paciente no encontrado
        </h2>
        <p className="text-medical-500 mt-2">
          El paciente que intentas acceder no existe o fue eliminado.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push("/patients")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a pacientes
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
            className="h-8 w-8 p-0"
            onClick={() => router.push(`/patients/${patientId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-medical-900">
              Nueva Evolución Clínica
            </h1>
            <p className="text-sm text-medical-500 flex items-center gap-2">
              <User className="h-4 w-4" />
              Paciente: {patient.full_name}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Context Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-medical-200 shadow-sm bg-medical-50/50">
            <CardHeader className="pb-3 border-b border-medical-100">
              <CardTitle className="text-sm font-semibold text-medical-800 flex items-center gap-2">
                <User className="h-4 w-4 text-medical-500" />
                Datos del Paciente
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-medical-500 font-medium">Nombre</span>
                <span className="font-semibold text-medical-900">
                  {patient.full_name}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-medical-100">
                <span className="text-medical-500 font-medium">DNI/CUIT</span>
                <span className="font-medium text-medical-700">
                  {patient.cuit || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-medical-100">
                <span className="text-medical-500 font-medium">
                  Obra Social
                </span>
                <span className="font-medium text-medical-700">
                  {patient.insurance_provider || "Particular"}
                </span>
              </div>
            </CardBody>
          </Card>

          {appointmentId && (
            <Card className="border-brand-200 shadow-sm bg-brand-50/30">
              <CardBody className="p-4 flex items-start gap-3">
                <div className="bg-brand-100 p-2 rounded-lg mt-0.5">
                  <Calendar className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-brand-900">
                    Consulta Vinculada
                  </h4>
                  <p className="text-xs text-brand-700 mt-1">
                    Esta evolución quedará asociada al turno seleccionado.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Main Form Area */}
        <div className="lg:col-span-2">
          <Card className="border-medical-200 shadow-sm">
            <CardHeader className="border-b border-medical-100 bg-white">
              <CardTitle className="text-lg font-bold text-medical-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-medical-600" />
                Detalle Clínico
              </CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-medical-700">
                      Fecha de Registro
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-medical-400" />
                      </div>
                      <Input
                        id="date"
                        type="date"
                        className={`pl-10 border-medical-200 focus:border-medical-400 focus:ring-medical-400 ${appointmentId ? "bg-medical-50 text-medical-500 cursor-not-allowed" : ""}`}
                        readOnly={!!appointmentId}
                        {...form.register("date")}
                      />
                    </div>
                    {form.formState.errors.date && (
                      <p className="text-xs text-danger mt-1 font-medium">
                        {form.formState.errors.date.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content" className="text-medical-700">
                    Evolución Médica
                  </Label>
                  <Textarea
                    id="content"
                    placeholder="Escriba los detalles de la consulta, síntomas, diagnóstico y tratamiento aquí..."
                    className="min-h-[300px] border-medical-200 focus:border-medical-400 focus:ring-medical-400 resize-y p-4 text-base leading-relaxed"
                    {...form.register("content")}
                  />
                  {form.formState.errors.content && (
                    <p className="text-xs text-danger mt-1 font-medium">
                      {form.formState.errors.content.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-medical-100 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelClick}
                    disabled={createRecordMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createRecordMutation.isPending}
                    className="gap-2"
                  >
                    {createRecordMutation.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar Evolución
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>

      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Desea descartar esta nota?</DialogTitle>
            <DialogDescription>
              El paciente está actualmente "En Consulta". Puede revertir su
              estado a la Sala de Espera o simplemente salir descartando el
              borrador.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleJustExit}
              disabled={isReverting}
            >
              Solo Salir (Descartar)
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-brand-600 hover:bg-brand-700 text-white"
              onClick={handleRevertTurno}
              disabled={isReverting}
            >
              {isReverting && <Spinner size="sm" className="mr-2" />}
              Descartar y Revertir Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDiscardAlertOpen}
        onOpenChange={setIsDiscardAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-danger">
              ⚠️ Descartar cambios
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tienes una nota clínica en progreso. Si sales ahora, perderás todo
              lo que escribiste. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDiscardAlertOpen(false)}
            >
              Seguir editando
            </Button>
            <Button variant="danger" onClick={handleConfirmDiscard}>
              Sí, descartar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function NewMedicalRecordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <MedicalRecordFormContent />
    </Suspense>
  );
}
