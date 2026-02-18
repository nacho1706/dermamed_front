"use client";

import api from "@/lib/api";
import type { User, PaginatedResponse } from "@/types";

export async function getUsers(params?: any): Promise<PaginatedResponse<User>> {
  const response = await api.get<PaginatedResponse<User>>("/users", { params });
  return response.data;
}

export async function getUser(id: number): Promise<User> {
  const response = await api.get<{ data: User }>(`/users/${id}`);
  return response.data.data;
}
