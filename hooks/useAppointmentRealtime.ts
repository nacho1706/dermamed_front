"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getEcho } from "@/lib/echo";
import type { Appointment } from "@/types";

interface AppointmentStatusPayload {
  id: number;
  status: Appointment["status"];
  patient_id: number;
  doctor_id: number;
  check_in_at: string | null;
  real_start_at: string | null;
  real_end_at: string | null;
  updated_at: string;
}

const CHANNEL = "appointments";

interface AppointmentCreatedPayload {
  id: number;
  doctor_id: number;
  date: string;
}

/**
 * Listens to real-time appointment events via WebSockets (Laravel Reverb).
 *
 * - appointment.created    → invalida queries para forzar refetch
 * - appointment.status.changed → actualiza el cache en-place sin refetch
 *
 * Mount this hook once at the dashboard layout level.
 */
export function useAppointmentRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(CHANNEL);

    // Nuevo turno creado — refetch de todas las queries de appointments
    channel.listen(".appointment.created", (_payload: AppointmentCreatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    });

    // Cambio de estado — actualiza cache en-place
    channel.listen(".appointment.status.changed", (payload: AppointmentStatusPayload) => {
      queryClient.setQueriesData(
        { queryKey: ["appointments"] },
        (old: { data: Appointment[] } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((apt) =>
              apt.id === payload.id
                ? {
                    ...apt,
                    status: payload.status,
                    check_in_at: payload.check_in_at,
                    real_start_at: payload.real_start_at,
                    real_end_at: payload.real_end_at,
                    updated_at: payload.updated_at,
                  }
                : apt,
            ),
          };
        },
      );

      queryClient.setQueryData(
        ["appointments", payload.id],
        (old: Appointment | undefined) => {
          if (!old) return old;
          return {
            ...old,
            status: payload.status,
            check_in_at: payload.check_in_at,
            real_start_at: payload.real_start_at,
            real_end_at: payload.real_end_at,
            updated_at: payload.updated_at,
          };
        },
      );
    });

    return () => {
      echo.leave(CHANNEL);
    };
  }, [queryClient]);
}
