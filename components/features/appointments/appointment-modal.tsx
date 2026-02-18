"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMinutes, parseISO } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Appointment, Patient, User, Service } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { getPatients } from "@/services/patients";
import { getUsers } from "@/services/users";
import { getServices } from "@/services/services";
import {
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  Stethoscope,
  FileText,
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
  const [endTime, setEndTime] = useState<string | null>(null);

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
      doctor_id: "",
      service_id: "",
      date: initialDate
        ? format(initialDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      time: initialDate ? format(initialDate, "HH:mm") : "09:00",
      notes: "",
    },
  });

  // Watch fields for end time calculation
  const selectedServiceId = watch("service_id");
  const selectedTime = watch("time");

  // Queries
  const { data: patientsData } = useQuery({
    queryKey: ["patients"],
    queryFn: () => getPatients({ cantidad: 100 }),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["users", "doctors"],
    queryFn: () => getUsers({ role: "doctor" }),
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => getServices(),
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      const start = parseISO(initialData.start_time);
      reset({
        patient_id: String(initialData.patient_id),
        doctor_id: String(initialData.doctor_id),
        service_id: String(initialData.service_id),
        date: format(start, "yyyy-MM-dd"),
        time: format(start, "HH:mm"),
        notes: initialData.notes || "",
      });
    } else if (initialDate) {
      reset({
        patient_id: "",
        doctor_id: "",
        service_id: "",
        date: format(initialDate, "yyyy-MM-dd"),
        time: format(initialDate, "HH:mm"),
        notes: "",
      });
    }
  }, [initialData, initialDate, reset, isOpen]);

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
    const start_time = `${data.date} ${data.time}:00`;

    onSubmit({
      patient_id: Number(data.patient_id),
      doctor_id: Number(data.doctor_id),
      service_id: Number(data.service_id),
      start_time,
      notes: data.notes,
      status: initialData ? initialData.status : "pending",
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <UserIcon className="h-4 w-4 mr-2 text-muted flex-shrink-0" />
                    <SelectValue placeholder="Seleccionar paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patientsData?.data.map((patient: Patient) => (
                      <SelectItem key={patient.id} value={String(patient.id)}>
                        {patient.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <Stethoscope className="h-4 w-4 mr-2 text-muted flex-shrink-0" />
                      <SelectValue placeholder="Seleccionar médico" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctorsData?.data.map((doctor: User) => (
                        <SelectItem key={doctor.id} value={String(doctor.id)}>
                          Dr. {doctor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <FileText className="h-4 w-4 mr-2 text-muted flex-shrink-0" />
                      <SelectValue placeholder="Seleccionar servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicesData?.data.map((service: Service) => (
                        <SelectItem key={service.id} value={String(service.id)}>
                          {service.name} ({service.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Input type="date" {...register("date")} />
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
                <Input type="time" className="pl-9" {...register("time")} />
              </div>
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
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Guardando..."
                : initialData
                  ? "Actualizar Turno"
                  : "Agendar Turno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
