"use client";

import api from "@/lib/api";
import type {
  Appointment,
  AppointmentFilters,
  PaginatedResponse,
} from "@/types";

export async function getAppointments(
  filters?: AppointmentFilters,
): Promise<PaginatedResponse<Appointment>> {
  const cleanParams = filters
    ? Object.fromEntries(
        Object.entries(filters).filter(
          ([, v]) => v !== undefined && v !== null && v !== "",
        ),
      )
    : undefined;

  const response = await api.get<PaginatedResponse<Appointment>>(
    "/appointments",
    {
      params: cleanParams,
    },
  );
  return response.data;
}

export async function getAppointment(id: number): Promise<Appointment> {
  const response = await api.get<{ data: Appointment }>(`/appointments/${id}`);
  return response.data.data;
}

export async function createAppointment(
  data: Partial<Appointment>,
): Promise<Appointment> {
  const response = await api.post<{ data: Appointment }>("/appointments", data);
  return response.data.data;
}

export async function updateAppointment(
  id: number,
  data: Partial<Appointment>,
): Promise<Appointment> {
  const response = await api.put<{ data: Appointment }>(
    `/appointments/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteAppointment(id: number): Promise<void> {
  await api.delete(`/appointments/${id}`);
}
