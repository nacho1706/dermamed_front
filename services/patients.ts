import api from "@/lib/api";
import type { Patient, PatientFilters, PaginatedResponse } from "@/types";

export async function getPatients(
  filters?: PatientFilters,
): Promise<PaginatedResponse<Patient>> {
  const response = await api.get<PaginatedResponse<Patient>>("/patients", {
    params: filters,
  });
  return response.data;
}

export async function getPatient(id: number): Promise<Patient> {
  const response = await api.get<{ data: Patient }>(`/patients/${id}`);
  return response.data.data;
}

export async function createPatient(data: Partial<Patient>): Promise<Patient> {
  const response = await api.post<{ data: Patient }>("/patients", data);
  return response.data.data;
}

export async function updatePatient(
  id: number,
  data: Partial<Patient>,
): Promise<Patient> {
  const response = await api.put<{ data: Patient }>(`/patients/${id}`, data);
  return response.data.data;
}

export async function deletePatient(id: number): Promise<void> {
  await api.delete(`/patients/${id}`);
}
