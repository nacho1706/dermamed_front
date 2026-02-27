"use client";

import { useEffect, useState, useMemo } from "react";
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
import { AsyncCombobox } from "@/components/shared/async-combobox";
import { FilterableSelect } from "@/components/shared/filterable-select";
import { Appointment, Patient, User, Service } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { getPatients } from "@/services/patients";
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
} from "lucide-react";

// Schema
const appointmentSchema = z.object({
  patient_id: z.string().min(1, "Seleccione un paciente"),
  doctor_id: z.string().min(1, "Seleccione un médico"),
  service_id: z.string().min(1, "Seleccione un servicio"),
  date: z.string().min(1, "Fecha requerida"),
  time: z.string().min(1, "Hora requerida"),
  notes: z.string().optional(),
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
    // If user is doctor and doesn't own the appointment, it's read-only
    return isDoctor && initialData.doctor_id !== user.id;
  }, [initialData, user, isDoctor]);

  const [endTime, setEndTime] = useState<string | null>(null);

  // ─── Block past dates/times ─────────────────────────────────────────
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
      doctor_id: isDoctor ? String(user?.id) : "",
      service_id: "",
      date: initialDate
        ? format(initialDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      time: initialDate ? format(initialDate, "HH:mm") : "09:00",
      notes: "",
    },
  });

  // Watch fields for end time calculation and working hours
  const selectedServiceId = watch("service_id");
  const selectedTime = watch("time");
  const selectedDoctorId = watch("doctor_id");
  const selectedDate = watch("date");

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

  // Determine working hours for the selected date and doctor
  const workingHours = useMemo(() => {
    if (!selectedDate || !availabilityData?.data) return null;
    const dayOfWeek = new Date(selectedDate + "T12:00:00").getDay();
    const avail = availabilityData.data.find(
      (a: DoctorAvailability) => a.day_of_week === dayOfWeek,
    );
    if (!avail) return null;
    return {
      start: avail.start_time.slice(0, 5), // "08:00"
      end: avail.end_time.slice(0, 5), // "18:00"
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

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        patient_id: String(initialData.patient_id),
        doctor_id: String(initialData.doctor_id),
        service_id: String(initialData.service_id),
        date: extractLocalDate(initialData.scheduled_start_at),
        time: extractLocalTime(initialData.scheduled_start_at),
        notes: initialData.notes || "",
      });
    } else if (initialDate) {
      reset({
        patient_id: "",
        doctor_id: isDoctor ? String(user?.id) : "",
        service_id: "",
        date: format(initialDate, "yyyy-MM-dd"),
        time: format(initialDate, "HH:mm"),
        notes: "",
      });
    } else if (isOpen) {
      reset({
        patient_id: "",
        doctor_id: isDoctor ? String(user?.id) : "",
        service_id: "",
        date: format(new Date(), "yyyy-MM-dd"),
        time: "09:00",
        notes: "",
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

  const handleFormSubmit = (data: AppointmentFormValues) => {
    if (isReadOnly) return;

    // Convert selected local time to UTC for the API
    const scheduled_start_at = localToUTC(data.date, data.time);

    // If doctor_id is disabled, it won't be in data. Use the watched value or fallback to user id
    const finalDoctorId =
      data.doctor_id || selectedDoctorId || (isDoctor ? String(user?.id) : "");

    onSubmit({
      patient_id: Number(data.patient_id),
      doctor_id: Number(finalDoctorId),
      service_id: Number(data.service_id),
      scheduled_start_at,
      notes: data.notes,
      status: initialData ? initialData.status : "scheduled",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar Turno" : "Nuevo Turno"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-5 py-2"
        >
          {/* Patient Select */}
          <div className="space-y-1.5">
            <Label
              htmlFor="patient_id"
              className="text-sm font-medium text-foreground"
            >
              Paciente
            </Label>
            <Controller
              name="patient_id"
              control={control}
              render={({ field }) => (
                <AsyncCombobox
                  value={field.value}
                  onChange={(val) => field.onChange(val ? String(val) : "")}
                  fetchFn={async (search) => {
                    const res = await getPatients({ search, cantidad: 10 });
                    return res.data;
                  }}
                  itemLabel={(p) => `${p.full_name} | DNI: ${p.dni || "N/A"}`}
                  itemValue={(p) => String(p.id)}
                  placeholder="Seleccionar paciente"
                  searchPlaceholder="Buscar paciente..."
                  disabled={!!initialData || isReadOnly}
                  selectedLabel={
                    initialData?.patient
                      ? `${initialData.patient.full_name} | DNI: ${initialData.patient.dni || "N/A"}`
                      : undefined
                  }
                />
              )}
            />
            {errors.patient_id && (
              <p className="text-xs text-danger font-medium">
                {errors.patient_id.message}
              </p>
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
                          // If doctor has working hours, use whichever is later
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
                  Horario disponible: {workingHours.start} – {workingHours.end}
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

          <DialogFooter className="pt-2 sm:justify-between items-center w-full">
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
                    disabled={isLoading || isReadOnly}
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
                  disabled={isLoading}
                  className={
                    initialData ? "bg-brand-600 hover:bg-brand-700" : ""
                  }
                >
                  {isLoading
                    ? "Guardando..."
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
