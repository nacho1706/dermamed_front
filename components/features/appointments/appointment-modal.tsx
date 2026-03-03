"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMinutes } from "date-fns";
import { localToUTC, extractLocalDate, extractLocalTime } from "@/lib/timezone";
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
import { Textarea } from "@/components/ui/textarea";
import { CreatableAsyncCombobox } from "@/components/shared/creatable-async-combobox";
import { FilterableSelect } from "@/components/shared/filterable-select";
import { Appointment, User, Service } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getAppointments } from "@/services/appointments";
import { getPatients, createPatient } from "@/services/patients";
import { getUsers } from "@/services/users";
import { getServices } from "@/services/services";
import { useAuth } from "@/contexts/auth-context";
import {
  getDoctorAvailabilities,
  DoctorAvailability,
} from "@/services/doctor-availability";
import {
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  Stethoscope,
  FileText,
  Info,
  UserPlus,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

// ─── Schema ──────────────────────────────────────────────────────────────────

const appointmentSchema = z
  .object({
    patient_id: z.string().optional(),
    // Inline new-patient fields
    new_patient_first_name: z.string().optional(),
    new_patient_last_name: z.string().optional(),
    new_patient_phone: z.string().optional(),
    // Core appointment fields
    doctor_id: z.string().min(1, "Seleccione un médico"),
    service_id: z.string().min(1, "Seleccione un servicio"),
    date: z.string().min(1, "Fecha requerida"),
    time: z.string().min(1, "Hora requerida"),
    notes: z.string().optional(),
    // Hidden flag — controlled by component state
    _is_creating_patient: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data._is_creating_patient) {
      // Patient ID not required — inline form fields are required instead
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
    } else {
      // Normal flow — patient_id required
      if (!data.patient_id || data.patient_id === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Seleccione un paciente",
          path: ["patient_id"],
        });
      }
    }
  });

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialDate?: Date;
  initialData?: Appointment;
  isLoading?: boolean;
}

export function AppointmentModal({
  isOpen,
  onClose,
  onSubmit,
  initialDate,
  initialData,
  isLoading,
}: AppointmentModalProps) {
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole("doctor");
  const isReadOnly = useMemo(() => {
    if (!initialData || !user) return false;
    return isDoctor && initialData.doctor_id !== user.id;
  }, [initialData, user, isDoctor]);

  const queryClient = useQueryClient();
  const [endTime, setEndTime] = useState<string | null>(null);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: "",
      new_patient_first_name: "",
      new_patient_last_name: "",
      new_patient_phone: "",
      doctor_id: isDoctor ? String(user?.id) : "",
      service_id: "",
      date: initialDate
        ? format(initialDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      time: initialDate ? format(initialDate, "HH:mm") : "09:00",
      notes: "",
      _is_creating_patient: false,
    },
  });

  const selectedServiceId = watch("service_id");
  const selectedTime = watch("time");
  const selectedDoctorId = watch("doctor_id");
  const selectedDate = watch("date");

  // Keep the hidden flag in sync with component state
  useEffect(() => {
    setValue("_is_creating_patient", isCreatingPatient);
  }, [isCreatingPatient, setValue]);

  const handleSwitchToSearch = useCallback(() => {
    setIsCreatingPatient(false);
    setValue("patient_id", "");
    setValue("new_patient_first_name", "");
    setValue("new_patient_last_name", "");
    setValue("new_patient_phone", "");
  }, [setValue]);

  const handleCreateRequest = useCallback(
    (searchText: string) => {
      setIsCreatingPatient(true);
      setValue("patient_id", "");
      // Pre-fill first name from search text (first word)
      const words = searchText.trim().split(/\s+/);
      setValue("new_patient_first_name", words[0] || "");
      setValue("new_patient_last_name", words.slice(1).join(" ") || "");
    },
    [setValue],
  );

  // Fetch doctor availabilities
  const { data: availabilityData } = useQuery({
    queryKey: ["doctor-availability", selectedDoctorId],
    queryFn: () =>
      getDoctorAvailabilities({
        doctor_id: Number(selectedDoctorId),
        cantidad: 100,
      }),
    enabled: !!selectedDoctorId,
  });

  const workingHours = useMemo(() => {
    if (!selectedDate || !availabilityData?.data) return null;
    const dayOfWeek = new Date(selectedDate + "T12:00:00").getDay();
    const avail = availabilityData.data.find(
      (a: DoctorAvailability) => a.day_of_week === dayOfWeek,
    );
    if (!avail) return null;
    return {
      start: avail.start_time.slice(0, 5),
      end: avail.end_time.slice(0, 5),
    };
  }, [selectedDate, availabilityData]);

  const { data: doctorsData } = useQuery({
    queryKey: ["users", "doctors"],
    queryFn: () => getUsers({ role: "doctor", cantidad: 100 }),
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => getServices(),
  });

  // Reset form on open/initialData change
  useEffect(() => {
    if (initialData) {
      setIsCreatingPatient(false);
      reset({
        patient_id: String(initialData.patient_id),
        new_patient_first_name: "",
        new_patient_last_name: "",
        new_patient_phone: "",
        doctor_id: String(initialData.doctor_id),
        service_id: String(initialData.service_id),
        date: extractLocalDate(initialData.scheduled_start_at),
        time: extractLocalTime(initialData.scheduled_start_at),
        notes: initialData.notes || "",
        _is_creating_patient: false,
      });
    } else if (initialDate) {
      setIsCreatingPatient(false);
      reset({
        patient_id: "",
        new_patient_first_name: "",
        new_patient_last_name: "",
        new_patient_phone: "",
        doctor_id: isDoctor ? String(user?.id) : "",
        service_id: "",
        date: format(initialDate, "yyyy-MM-dd"),
        time: format(initialDate, "HH:mm"),
        notes: "",
        _is_creating_patient: false,
      });
    } else if (isOpen) {
      setIsCreatingPatient(false);
      reset({
        patient_id: "",
        new_patient_first_name: "",
        new_patient_last_name: "",
        new_patient_phone: "",
        doctor_id: isDoctor ? String(user?.id) : "",
        service_id: "",
        date: format(new Date(), "yyyy-MM-dd"),
        time: "09:00",
        notes: "",
        _is_creating_patient: false,
      });
    }
  }, [initialData, initialDate, reset, isOpen, isDoctor, user?.id]);

  // Calculate end time
  useEffect(() => {
    if (selectedServiceId && selectedTime && servicesData?.data) {
      const service = servicesData.data.find(
        (s) => String(s.id) === selectedServiceId,
      );
      if (service) {
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        const endDate = addMinutes(date, service.duration_minutes);
        setEndTime(format(endDate, "HH:mm"));
      }
    } else {
      setEndTime(null);
    }
  }, [selectedServiceId, selectedTime, servicesData]);

  // Local overlap validation
  const hasConflict = useMemo(() => {
    if (!selectedDate || !selectedTime || !endTime || !selectedDoctorId)
      return false;

    const queries = queryClient.getQueriesData<any>({
      queryKey: ["appointments"],
    });
    const apts: Appointment[] = [];
    queries.forEach(([, data]) => {
      if (data?.data && Array.isArray(data.data)) {
        apts.push(...data.data);
      }
    });

    const formStartUTC = localToUTC(selectedDate, selectedTime);
    const formEndUTC = localToUTC(selectedDate, endTime);
    const startMs = new Date(formStartUTC.replace(" ", "T") + "Z").getTime();
    const endMs = new Date(formEndUTC.replace(" ", "T") + "Z").getTime();

    for (const apt of apts) {
      if (apt.doctor_id !== Number(selectedDoctorId)) continue;
      if (initialData && apt.id === initialData.id) continue;
      if (["completed", "cancelled", "no_show"].includes(apt.status)) continue;

      const aptStart = new Date(apt.scheduled_start_at).getTime();
      const aptEnd = new Date(apt.scheduled_end_at).getTime();

      if (Math.max(startMs, aptStart) < Math.min(endMs, aptEnd)) {
        return true;
      }
    }
    return false;
  }, [
    selectedDate,
    selectedTime,
    endTime,
    selectedDoctorId,
    initialData,
    queryClient,
  ]);

  // ─── Dual-submit with safe error handling ────────────────────────────
  const handleFormSubmit = async (data: AppointmentFormValues) => {
    if (isReadOnly) return;

    setIsSubmitting(true);
    try {
      let patientId: number;

      if (isCreatingPatient) {
        // Step 1: create patient — isolated try/catch so a failure doesn't leak
        let newPatient;
        try {
          newPatient = await createPatient({
            first_name: data.new_patient_first_name?.trim(),
            last_name: data.new_patient_last_name?.trim(),
            phone: data.new_patient_phone?.trim() || undefined,
          });
        } catch (patientError: any) {
          const responseData = patientError.response?.data;
          let message = "Error al registrar el paciente";
          if (responseData?.errors) {
            const firstKey = Object.keys(responseData.errors)[0];
            message = responseData.errors[firstKey][0];
          } else if (responseData?.message) {
            message = responseData.message;
          }
          toast.error(message);
          setIsSubmitting(false);
          return; // Stop here — never reach createAppointment
        }

        patientId = newPatient.id;
      } else {
        patientId = Number(data.patient_id);
      }

      // Step 2: build appointment payload and delegate to parent
      const finalDoctorId =
        data.doctor_id ||
        selectedDoctorId ||
        (isDoctor ? String(user?.id) : "");

      const payload = {
        patient_id: patientId,
        doctor_id: Number(finalDoctorId),
        service_id: Number(data.service_id),
        scheduled_start_at: localToUTC(data.date, data.time),
        is_overbook: hasConflict,
        notes: data.notes,
        status: initialData ? initialData.status : "scheduled",
      };

      onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isLoading || isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle>
            {initialData ? "Editar Turno" : "Nuevo Turno"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5 py-2">
            {/* Patient Select */}
            <div className="space-y-1.5">
              <Label
                htmlFor="patient_id"
                className="text-sm font-medium text-foreground"
              >
                Paciente
              </Label>

              {/* Combobox — hidden when in creation mode */}
              {!isCreatingPatient && (
                <Controller
                  name="patient_id"
                  control={control}
                  render={({ field }) => (
                    <CreatableAsyncCombobox
                      value={field.value}
                      onChange={(val) => field.onChange(val ? String(val) : "")}
                      onCreateRequest={handleCreateRequest}
                      fetchFn={async (search) => {
                        const res = await getPatients({ search, cantidad: 10 });
                        return res.data;
                      }}
                      placeholder="Seleccionar paciente"
                      searchPlaceholder="Buscar por nombre, apellido o teléfono..."
                      disabled={!!initialData || isReadOnly}
                      selectedLabel={
                        initialData?.patient
                          ? `${initialData.patient.full_name}${initialData.patient.dni ? ` | DNI: ${initialData.patient.dni}` : ""}`
                          : undefined
                      }
                      queryKey="appointment-modal-patient"
                    />
                  )}
                />
              )}

              {(errors as any).patient_id && !isCreatingPatient && (
                <p className="text-xs text-danger font-medium">
                  {(errors as any).patient_id.message}
                </p>
              )}

              {/* ─── Inline "Express" Patient Creation Form ───────────────── */}
              {isCreatingPatient && (
                <div
                  className={cn(
                    "rounded-[var(--radius-md)] border border-brand-200 bg-brand-50/40 p-4 space-y-3",
                    "animate-in slide-in-from-top-2 duration-200",
                  )}
                >
                  {/* Header */}
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

                  <p className="text-[11px] text-muted leading-tight">
                    Solo nombre, apellido y teléfono. El DNI se puede completar
                    después en el perfil del paciente.
                  </p>

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

                  {/* Phone */}
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
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Doctor Select */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="doctor_id"
                  className="text-sm font-medium text-foreground"
                >
                  Médico
                </Label>
                <Controller
                  name="doctor_id"
                  control={control}
                  render={({ field }) => (
                    <FilterableSelect
                      value={field.value}
                      onChange={(val) => field.onChange(val ? String(val) : "")}
                      options={(doctorsData?.data || []).map((d) => ({
                        label: `Dr. ${d.name}`,
                        value: String(d.id),
                      }))}
                      placeholder="Seleccionar médico"
                      disabled={isDoctor || isReadOnly}
                    />
                  )}
                />
                {errors.doctor_id && (
                  <p className="text-xs text-danger font-medium">
                    {errors.doctor_id.message}
                  </p>
                )}
              </div>

              {/* Service Select */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="service_id"
                  className="text-sm font-medium text-foreground"
                >
                  Servicio
                </Label>
                <Controller
                  name="service_id"
                  control={control}
                  render={({ field }) => (
                    <FilterableSelect
                      value={field.value}
                      onChange={(val) => field.onChange(val ? String(val) : "")}
                      options={(servicesData?.data || []).map((s) => ({
                        label: `${s.name} (${s.duration_minutes} min)`,
                        value: String(s.id),
                      }))}
                      placeholder="Seleccionar servicio"
                      disabled={isReadOnly}
                    />
                  )}
                />
                {errors.service_id && (
                  <p className="text-xs text-danger font-medium">
                    {errors.service_id.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="date"
                  className="text-sm font-medium text-foreground"
                >
                  Fecha
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    min={todayStr}
                    {...register("date")}
                    disabled={isReadOnly}
                  />
                </div>
                {errors.date && (
                  <p className="text-xs text-danger font-medium">
                    {errors.date.message}
                  </p>
                )}
              </div>

              {/* Time */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="time"
                  className="text-sm font-medium text-foreground"
                >
                  Hora Inicio
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                  <Input
                    type="time"
                    className="pl-9"
                    min={
                      selectedDate === todayStr
                        ? (() => {
                            const nowTime = format(new Date(), "HH:mm");
                            if (
                              workingHours?.start &&
                              workingHours.start > nowTime
                            ) {
                              return workingHours.start;
                            }
                            return nowTime;
                          })()
                        : workingHours?.start
                    }
                    max={workingHours?.end}
                    {...register("time")}
                    disabled={isReadOnly}
                  />
                </div>
                {workingHours && (
                  <p className="text-xs text-muted flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Horario disponible: {workingHours.start} –{" "}
                    {workingHours.end}
                  </p>
                )}
                {selectedDoctorId &&
                  selectedDate &&
                  !workingHours &&
                  availabilityData && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      El médico no tiene horario configurado para este día
                    </p>
                  )}
                {hasConflict && (
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-300">
                    <span className="text-sm">⚠️</span> Horario ocupado
                    (Sobreturno)
                  </p>
                )}
                {errors.time && (
                  <p className="text-xs text-danger font-medium">
                    {errors.time.message}
                  </p>
                )}
              </div>
            </div>

            {/* End Time Preview */}
            {endTime && (
              <div className="text-sm text-muted flex items-center gap-2 bg-surface-secondary px-3 py-2.5 rounded-[var(--radius-md)] border border-border/50">
                <Clock className="h-4 w-4 text-brand-500 flex-shrink-0" />
                <span>
                  Finaliza aproximadamente a las{" "}
                  <strong className="text-foreground">{endTime}</strong> hs
                </span>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label
                htmlFor="notes"
                className="text-sm font-medium text-foreground"
              >
                Notas (Opcional)
              </Label>
              <Textarea
                {...register("notes")}
                placeholder="Detalles adicionales para el turno..."
                className="resize-none"
                disabled={isReadOnly}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0 sm:justify-between items-center w-full">
            <div className="flex gap-2 w-full justify-start">
              {initialData &&
                initialData.status !== "cancelled" &&
                initialData.status !== "completed" && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (
                        confirm(
                          "¿Está seguro que desea cancelar este turno? Esta acción no se puede deshacer.",
                        )
                      ) {
                        onSubmit({ status: "cancelled" });
                      }
                    }}
                    disabled={isBusy || isReadOnly}
                  >
                    Cancelar Turno
                  </Button>
                )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              {!isReadOnly && (
                <Button
                  type="submit"
                  disabled={isBusy}
                  className={cn(
                    "transition-all duration-300 ease-in-out",
                    !hasConflict
                      ? "bg-brand-600 hover:bg-brand-700 text-white"
                      : "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/20",
                  )}
                >
                  {isBusy
                    ? isCreatingPatient && isSubmitting
                      ? "Registrando paciente..."
                      : "Guardando..."
                    : hasConflict
                      ? initialData
                        ? "Actualizar como Sobreturno"
                        : "Forzar Sobreturno"
                      : initialData
                        ? "Actualizar Turno"
                        : "Agendar Turno"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
