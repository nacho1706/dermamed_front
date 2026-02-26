"use client";

import api from "@/lib/api";
import type { Role } from "@/types";

export async function getRoles(): Promise<Role[]> {
  const response = await api.get<{ data: Role[] }>("/roles");
  return response.data.data;
}
