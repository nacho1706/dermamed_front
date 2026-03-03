"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { UserCheck, UserPlus, ChevronLeft, Play } from "lucide-react";
import { CreatableAsyncCombobox } from "@/components/shared/creatable-async-combobox";
import { FilterableSelect } from "@/components/shared/filterable-select";
import { ActiveConsultationAlertModal } from "@/components/features/appointments/active-consultation-alert-modal";
import type { Appointment } from "@/types";
import { cn } from "@/lib/utils";

import { createPatient, getPatients } from "@/services/patients";
import { createAppointment } from "@/services/appointments";
import { getServices } from "@/services/services";
import { getUsers } from "@/services/users";
import { useAuth } from "@/contexts/auth-context";
import { localToUTC } from "@/lib/timezone";
import { format, addMinutes } from "date-fns";
import { toast } from "sonner";

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z
  .object({
    patient_id: z.string().optional(),
    // Inline new-patient fields
    new_patient_first_name: z.string().optional(),
    new_patient_last_name: z.string().optional(),
    new_patient_dni: z.string().optional(),
    new_patient_phone: z.string().optional(),
    // Appointment fields
    service_id: z.string().min(1, "Seleccione un servicio"),
    doctor_id: z.string().optional(),
    // Hidden flag
    _is_creating_patient: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data._is_creating_patient) {
      if (!data.new_patient_first_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre es requerido",
          path: ["new_patient_first_name"],
        });
      }
      if (!data.new_patient_last_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El apellido es requerido",
          path: ["new_patient_last_name"],
        });
      }
      if (!data.new_patient_dni?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El DNI es requerido",
          path: ["new_patient_dni"],
        });
      } else if (!/^\d{7,8}$/.test(data.new_patient_dni.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El DNI debe tener 7 u 8 dígitos",
          path: ["new_patient_dni"],
        });
      }
    } else {
      if (!data.patient_id || data.patient_id === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Seleccione un paciente",
          path: ["patient_id"],
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

interface ImmediateAttentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAppointment?: Appointment | null;
}

export function ImmediateAttentionModal({
  isOpen,
  onClose,
  activeAppointment,
}: ImmediateAttentionModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole("doctor");
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => getServices(),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["users", "doctors"],
    queryFn: () => getUsers({ role: "doctor", is_active: true, cantidad: 100 }),
    enabled: !isDoctor,
  });

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patient_id: "",
      new_patient_first_name: "",
      new_patient_last_name: "",
      new_patient_dni: "",
      new_patient_phone: "",
      service_id: "",
      doctor_id: "",
      _is_creating_patient: false,
    },
  });

  // Keep hidden flag in sync with local state
  useEffect(() => {
    setValue("_is_creating_patient", isCreatingPatient);
  }, [isCreatingPatient, setValue]);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setIsCreatingPatient(false);
      reset({
        patient_id: "",
        new_patient_first_name: "",
        new_patient_last_name: "",
        new_patient_dni: "",
        new_patient_phone: "",
        service_id: "",
        doctor_id: "",
        _is_creating_patient: false,
      });
    }
  }, [isOpen, reset]);

  const handleSwitchToSearch = useCallback(() => {
    setIsCreatingPatient(false);
    setValue("patient_id", "");
    setValue("new_patient_first_name", "");
    setValue("new_patient_last_name", "");
    setValue("new_patient_dni", "");
    setValue("new_patient_phone", "");
  }, [setValue]);

  const handleCreateRequest = useCallback(
    (searchText: string) => {
      setIsCreatingPatient(true);
      setValue("patient_id", "");
      const words = searchText.trim().split(/\s+/);
      setValue("new_patient_first_name", words[0] || "");
      setValue("new_patient_last_name", words.slice(1).join(" ") || "");
    },
    [setValue],
  );

  // Mutation: create appointment
  const createAppointmentMutation = useMutation({
    mutationFn: (data: {
      patient_id: number;
      service_id: number;
      doctor_id?: string;
    }) => {
      const now = new Date();
      const nowString = format(now, "yyyy-MM-dd");
      const timeString = format(now, "HH:mm");
      const scheduled_start_at = localToUTC(nowString, timeString);

      const service = servicesData?.data.find(
        (s) => String(s.id) === String(data.service_id),
      );
      const duration = service?.duration_minutes || 30;

      const endTimeDate = addMinutes(now, duration);
      const scheduled_end_at = localToUTC(
        format(endTimeDate, "yyyy-MM-dd"),
        format(endTimeDate, "HH:mm"),
      );

      const resolvedDoctorId = isDoctor ? user!.id : Number(data.doctor_id);

      return createAppointment({
        patient_id: data.patient_id,
        doctor_id: resolvedDoctorId,
        service_id: data.service_id,
        scheduled_start_at,
        scheduled_end_at,
        is_overbook: false,
        reserve_channel: "manual",
        status: isDoctor ? "in_progress" : "in_waiting_room",
        notes: isDoctor ? "Atención inmediata" : "Ingreso sin turno",
      });
    },
    onSuccess: (appointment) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      if (isDoctor) {
        router.push(
          `/patients/${appointment.patient_id}/medical-records/new?appointment_id=${appointment.id}`,
        );
      } else {
        toast.success("Paciente ingresado a sala de espera");
        onClose();
      }
    },
    onError: (error: any) => {
      const errors = error.response?.data?.errors;
      if (errors) {
        const firstError = Object.values(errors)[0] as string[];
        toast.error(firstError[0] || "Error al crear el turno");
      } else {
        toast.error(error.response?.data?.message || "Error al crear el turno");
      }
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    // Non-doctor: validate doctor selection
    if (!isDoctor && !data.doctor_id) {
      toast.error("Debe seleccionar un médico");
      return;
    }

    if (activeAppointment) {
      setIsConflictModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let patientId: number;

      if (isCreatingPatient) {
        try {
          const newPatient = await createPatient({
            first_name: data.new_patient_first_name?.trim(),
            last_name: data.new_patient_last_name?.trim(),
            dni: data.new_patient_dni?.trim(),
            phone: data.new_patient_phone?.trim() || undefined,
          });
          patientId = newPatient.id;
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        } catch (patientError: any) {
          const status = patientError.response?.status;
          const responseData = patientError.response?.data;
          if (status === 409) {
            toast.error(
              "Ya existe un paciente registrado con ese DNI. Buscalo usando el buscador.",
            );
            return;
          }
          let message = "Error al registrar el paciente";
          if (responseData?.errors) {
            const firstKey = Object.keys(responseData.errors)[0];
            message = responseData.errors[firstKey][0];
          } else if (responseData?.message) {
            message = responseData.message;
          }
          toast.error(message);
          return;
        }
      } else {
        patientId = Number(data.patient_id);
      }

      await createAppointmentMutation.mutateAsync({
        patient_id: patientId,
        service_id: Number(data.service_id),
        doctor_id: data.doctor_id,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || createAppointmentMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand-600" />
            <DialogTitle>Registro de Ingreso Directo</DialogTitle>
          </div>
          <p className="text-sm text-muted mt-1">
            {isDoctor
              ? "Crea un turno en curso al instante."
              : "Registra un paciente en sala de espera sin turno previo."}
          </p>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5 py-3">
            {/* Patient searcher */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                Paciente
              </Label>

              {!isCreatingPatient && (
                <Controller
                  name="patient_id"
                  control={control}
                  render={({ field }) => (
                    <CreatableAsyncCombobox
                      value={field.value}
                      onChange={(val) =>
                        field.onChange(val ? String(val) : "")
                      }
                      onCreateRequest={handleCreateRequest}
                      fetchFn={async (search) => {
                        const res = await getPatients({ search, cantidad: 10 });
                        return res.data;
                      }}
                      placeholder="Seleccionar paciente"
                      searchPlaceholder="Buscar por nombre, apellido o DNI..."
                      queryKey="direct-entry-modal-patient"
                    />
                  )}
                />
              )}

              {(errors as any).patient_id && !isCreatingPatient && (
                <p className="text-xs text-danger font-medium">
                  {(errors as any).patient_id.message}
                </p>
              )}

              {/* ─── Inline Express Patient Form ─────────────────────────── */}
              {isCreatingPatient && (
                <div
                  className={cn(
                    "rounded-[var(--radius-md)] border border-brand-200 bg-brand-50/40 p-4 space-y-3",
                    "animate-in slide-in-from-top-2 duration-200",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <UserPlus className="h-4 w-4 text-brand-600" />
                      <span className="text-sm font-semibold text-brand-700">
                        Registro Exprés
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSwitchToSearch}
                      className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Buscar existente
                    </button>
                  </div>

                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-foreground">
                        Nombre *
                      </Label>
                      <Input
                        {...register("new_patient_first_name")}
                        placeholder="Ej: Juan"
                        className="h-9 text-sm"
                      />
                      {errors.new_patient_first_name && (
                        <p className="text-[11px] text-danger">
                          {errors.new_patient_first_name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-foreground">
                        Apellido *
                      </Label>
                      <Input
                        {...register("new_patient_last_name")}
                        placeholder="Ej: Pérez"
                        className="h-9 text-sm"
                      />
                      {errors.new_patient_last_name && (
                        <p className="text-[11px] text-danger">
                          {errors.new_patient_last_name.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* DNI + Phone row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-foreground">DNI *</Label>
                      <Input
                        {...register("new_patient_dni", {
                          onChange: (e) => {
                            e.target.value = e.target.value
                              .replace(/\\D/g, "")
                              .slice(0, 8);
                          },
                        })}
                        placeholder="Ej: 30452758"
                        maxLength={8}
                        inputMode="numeric"
                        className="h-9 text-sm"
                      />
                      {errors.new_patient_dni && (
                        <p className="text-[11px] text-danger">
                          {errors.new_patient_dni.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-foreground">
                        Teléfono{" "}
                        <span className="text-muted font-normal">(opcional)</span>
                      </Label>
                      <Input
                        {...register("new_patient_phone")}
                        placeholder="Ej: 3813193828"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Service */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                Servicio / Motivo
              </Label>
              <Controller
                name="service_id"
                control={control}
                render={({ field }) => (
                  <FilterableSelect
                    value={field.value}
                    onChange={(val) => field.onChange(val ? String(val) : "")}
                    options={(servicesData?.data || []).map((s) => ({
                      label: s.name,
                      value: String(s.id),
                    }))}
                    placeholder="Seleccionar servicio..."
                  />
                )}
              />
              {errors.service_id && (
                <p className="text-xs text-danger font-medium">
                  {errors.service_id.message}
                </p>
              )}
            </div>

            {/* Doctor selector: only shown for non-doctors */}
            {!isDoctor && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  Médico Asignado <span className="text-danger">*</span>
                </Label>
                <Controller
                  name="doctor_id"
                  control={control}
                  render={({ field }) => (
                    <FilterableSelect
                      value={field.value || ""}
                      onChange={(val) =>
                        field.onChange(val ? String(val) : "")
                      }
                      options={(doctorsData?.data || []).map((d) => ({
                        label: d.name,
                        value: String(d.id),
                      }))}
                      placeholder="Seleccionar médico..."
                    />
                  )}
                />
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isBusy}
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              {isBusy ? (
                <Spinner className="mr-2" size="sm" />
              ) : (
                <Play className="w-4 h-4 mr-2 fill-current" />
              )}
              {isDoctor ? "Ingresar a Consulta" : "Ingresar a Espera"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ActiveConsultationAlertModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        activeAppointment={activeAppointment || null}
      />
    </Dialog>
  );
}
