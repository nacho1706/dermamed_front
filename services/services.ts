import api from "@/lib/api";
import type { Service, PaginatedResponse, PaginationParams } from "@/types";

export interface ServiceFilters extends PaginationParams {
  name?: string;
}

export async function getServices(
  filters?: ServiceFilters,
): Promise<PaginatedResponse<Service>> {
  const response = await api.get<PaginatedResponse<Service>>("/services", {
    params: filters,
  });
  return response.data;
}

export async function getService(id: number): Promise<Service> {
  const response = await api.get<{ data: Service }>(`/services/${id}`);
  return response.data.data;
}

export async function createService(data: Partial<Service>): Promise<Service> {
  const response = await api.post<{ data: Service }>("/services", data);
  return response.data.data;
}

export async function updateService(
  id: number,
  data: Partial<Service>,
): Promise<Service> {
  const response = await api.put<{ data: Service }>(`/services/${id}`, data);
  return response.data.data;
}

export async function deleteService(id: number): Promise<void> {
  await api.delete(`/services/${id}`);
}
