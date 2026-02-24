"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/features/appointments/calendar";
import { AppointmentModal } from "@/components/features/appointments/appointment-modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Stethoscope } from "lucide-react";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
} from "@/services/appointments";
import { getUsers } from "@/services/users";
import { Appointment, User } from "@/types";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { localToUTC } from "@/lib/timezone";

export default function AppointmentsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<
    Appointment | undefined
  >(undefined);
  const [selectedSlot, setSelectedSlot] = useState<Date | undefined>(undefined);

  const queryClient = useQueryClient();

  // Date range for current week view
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Queries
  const { data: appointmentsData, isLoading: isLoadingAppointments } = useQuery(
    {
      queryKey: [
        "appointments",
        format(startDate, "yyyy-MM-dd"),
        selectedDoctorId,
      ],
      queryFn: () => {
        const dateFromUTC = localToUTC(
          format(startDate, "yyyy-MM-dd"),
          "00:00",
        );
        const dateToUTC = localToUTC(format(endDate, "yyyy-MM-dd"), "23:59");
        return getAppointments({
          date_from: dateFromUTC,
          date_to: dateToUTC,
          doctor_id:
            selectedDoctorId !== "all" ? Number(selectedDoctorId) : undefined,
          cantidad: 100,
        });
      },
    },
  );

  const { data: doctorsData } = useQuery({
    queryKey: ["users", "doctors"],
    queryFn: () => getUsers({ role: "doctor" }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Turno agendado correctamente");
      handleCloseModal();
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Error al agendar el turno";
      toast.error(message);
    },
  });

  const { user, hasRole } = useAuth();
  const router = useRouter();

  // ... (keeping other states)

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Appointment> }) =>
      updateAppointment(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Turno actualizado correctamente");
      handleCloseModal();

      // Redirection logic: if starting consultation, go to patient record
      if (
        (variables.data.status as string) === "in_progress" &&
        hasRole("doctor")
      ) {
        router.push(`/patients/${response.patient_id}`);
      }
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Error al actualizar el turno";
      toast.error(message);
    },
  });

  // Handlers
  const handleSlotClick = (date: Date) => {
    setSelectedSlot(date);
    setSelectedAppointment(undefined);
    setIsModalOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setSelectedSlot(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(undefined);
    setSelectedSlot(undefined);
  };

  const handleSubmit = (data: any) => {
    if (selectedAppointment) {
      updateMutation.mutate({ id: selectedAppointment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-5 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Calendario de Turnos
          </h1>
          <p className="text-sm text-muted mt-1">
            Gestiona la disponibilidad y turnos de los profesionales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Doctor Filter */}
          <div className="w-[220px]">
            <Select
              value={selectedDoctorId}
              onValueChange={setSelectedDoctorId}
            >
              <SelectTrigger>
                <Stethoscope className="h-4 w-4 mr-2 text-muted flex-shrink-0" />
                <SelectValue placeholder="Filtrar por médico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los médicos</SelectItem>
                {doctorsData?.data.map((doctor: User) => (
                  <SelectItem key={doctor.id} value={String(doctor.id)}>
                    Dr. {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => {
              setSelectedAppointment(undefined);
              setSelectedSlot(undefined);
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Turno
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {isLoadingAppointments ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : (
          <Calendar
            appointments={appointmentsData?.data || []}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
      </div>

      {/* Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialDate={selectedSlot}
        initialData={selectedAppointment}
        isLoading={isLoading}
      />
    </div>
  );
}
