import api from "@/lib/api";
import type { PaginatedResponse } from "@/types";

export interface DoctorAvailability {
  id: number;
  doctor_id: number;
  day_of_week: number; // 0=Sunday, 1=Monday ... 6=Saturday
  start_time: string; // "08:00:00"
  end_time: string; // "18:00:00"
  doctor?: {
    id: number;
    name: string;
  };
}

export async function getDoctorAvailabilities(filters?: {
  doctor_id?: number;
  cantidad?: number;
}): Promise<PaginatedResponse<DoctorAvailability>> {
  const response = await api.get<PaginatedResponse<DoctorAvailability>>(
    "/doctor-availabilities",
    { params: filters },
  );
  return response.data;
}
