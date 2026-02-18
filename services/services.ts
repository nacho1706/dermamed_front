"use client";

import api from "@/lib/api";
import type { Service, PaginatedResponse } from "@/types";

export async function getServices(
  params?: any,
): Promise<PaginatedResponse<Service>> {
  const response = await api.get<PaginatedResponse<Service>>("/services", {
    params,
  });
  return response.data;
}

export async function getService(id: number): Promise<Service> {
  const response = await api.get<{ data: Service }>(`/services/${id}`);
  return response.data.data;
}
