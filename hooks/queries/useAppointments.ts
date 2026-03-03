import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/services/appointments";
import type { AppointmentFilters, Appointment } from "@/types";
import {
  PaginatedAppointmentsSchema,
  AppointmentSchema,
} from "@/lib/schemas/appointment";
import { sileo } from "sileo";

export function useAppointments(filters?: AppointmentFilters) {
  return useQuery({
    queryKey: ["appointments", filters],
    queryFn: async () => {
      const response = await getAppointments(filters);
      return PaginatedAppointmentsSchema.parse(response);
    },
  });
}

export function useAppointment(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["appointments", id],
    queryFn: async () => {
      const response = await getAppointment(id);
      return AppointmentSchema.parse(response);
    },
    enabled: options?.enabled,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      sileo.success({
        title: "Turno creado",
        description: "El turno fue agendado exitosamente.",
      });
    },
    onError: () => {
      sileo.error({
        title: "Error",
        description: "Hubo un problema al crear el turno.",
      });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Appointment> }) =>
      updateAppointment(id, data),
    // Optimistic Update Implementation
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["appointments"] });

      // Snapshot the previous value
      const previousAppointments = queryClient.getQueryData(["appointments"]);

      // Optimistically update the cache for paginated lists
      queryClient.setQueriesData(
        { queryKey: ["appointments"] },
        (old: { data: Appointment[] } | undefined) => {
          if (!old || !old.data) return old;
          return {
            ...old,
            data: old.data.map((apt: Appointment) =>
              apt.id === id ? { ...apt, ...data } : apt,
            ),
          };
        },
      );

      // Optimistically update the individual query
      const previousSingle = queryClient.getQueryData(["appointments", id]);
      if (previousSingle) {
        queryClient.setQueryData(["appointments", id], {
          ...(previousSingle as Appointment),
          ...data,
        });
      }

      // Return a context with the previous data to rollback if necessary
      return { previousAppointments, previousSingle };
    },
    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousAppointments) {
        queryClient.setQueriesData(
          { queryKey: ["appointments"] },
          context.previousAppointments,
        );
      }
      if (context?.previousSingle) {
        queryClient.setQueryData(
          ["appointments", variables.id],
          context.previousSingle,
        );
      }
      sileo.error({
        title: "Error de Guardado",
        description:
          "No se guardaron los cambios. El turno volvió a su estado original.",
      });
    },
    // Always refetch after error or success to ensure synchronization
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({
        queryKey: ["appointments", variables.id],
      });
      // Only show success toast if there was no error
      if (!error) {
        sileo.success({
          title: "Turno actualizado",
          description: "Los cambios se aplicaron correctamente.",
        });
      }
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      sileo.success({
        title: "Turno eliminado",
        description: "El turno fue cancelado/eliminado correctamente.",
      });
    },
    onError: () => {
      sileo.error({
        title: "Error",
        description: "No se pudo eliminar el turno.",
      });
    },
  });
}
