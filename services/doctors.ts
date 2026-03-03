import api from "@/lib/api";
import type { User, PaginatedResponse } from "@/types";

export async function getDoctors(params?: { cantidad?: number; pagina?: number; role?: string }): Promise<PaginatedResponse<User>> {
    const response = await api.get<PaginatedResponse<User>>("/users", {
        params: { ...params, role: 'doctor' }
    });
    return response.data;
}
