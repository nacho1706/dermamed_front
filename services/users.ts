"use client";

import api from "@/lib/api";
import type { User, PaginatedResponse, PaginationParams } from "@/types";

export interface UserFilters extends PaginationParams {
  name?: string;
  email?: string;
  role_id?: number;
  role?: string;
  is_active?: boolean;
}

export async function getUsers(
  params?: UserFilters,
): Promise<PaginatedResponse<User>> {
  const apiParams: any = { ...params };
  if (apiParams.is_active !== undefined) {
    apiParams.is_active = apiParams.is_active ? 1 : 0;
  }
  if (apiParams.cantidad !== undefined) {
    apiParams.per_page = apiParams.cantidad;
    delete apiParams.cantidad;
  }

  const response = await api.get<PaginatedResponse<User>>("/users", { params: apiParams });
  return response.data;
}

export async function getUser(id: number): Promise<User> {
  const response = await api.get<{ data: User }>(`/users/${id}`);
  return response.data.data;
}

export async function inviteUser(data: {
  name: string;
  email: string;
  role_id: number;
}): Promise<User> {
  const response = await api.post<{ data: User }>("/users/invite", data);
  return response.data.data;
}

export async function resendInvite(id: number): Promise<void> {
  await api.post(`/users/${id}/resend-invite`);
}

export async function updateUser(
  id: number,
  data: Partial<User> & { password?: string; role_id?: number },
): Promise<User> {
  const response = await api.put<{ data: User }>(`/users/${id}`, data);
  return response.data.data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}
