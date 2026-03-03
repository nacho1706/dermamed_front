"use client";

import api from "@/lib/api";
import type {
  User,
  PaginatedResponse,
  PaginationParams,
  InviteUserRequest,
} from "@/types";

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
  const response = await api.get<PaginatedResponse<User>>("/users", { params });
  return response.data;
}

export async function getUser(id: number): Promise<User> {
  const response = await api.get<{ data: User }>(`/users/${id}`);
  return response.data.data;
}

export async function inviteUser(data: InviteUserRequest): Promise<User> {
  const response = await api.post<{ data: User }>("/users/invite", data);
  return response.data.data;
}

export async function resendInvite(id: number): Promise<void> {
  await api.post(`/users/${id}/resend-invite`);
}

export async function updateUser(
  id: number,
  data: Partial<User> & { password?: string; role_ids?: number[] },
): Promise<User> {
  const response = await api.put<{ data: User }>(`/users/${id}`, data);
  return response.data.data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}
