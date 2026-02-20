import api from "@/lib/api";
import type {
  MedicalRecord,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

// ─── Medical Record Filters ─────────────────────────────────────────────────

export interface MedicalRecordFilters extends PaginationParams {
  patient_id?: number;
  doctor_id?: number;
}

// ─── Medical Records CRUD ───────────────────────────────────────────────────

export async function getMedicalRecords(
  filters?: MedicalRecordFilters,
): Promise<PaginatedResponse<MedicalRecord>> {
  const response = await api.get<PaginatedResponse<MedicalRecord>>(
    "/medical-records",
    { params: filters },
  );
  return response.data;
}

export async function getMedicalRecord(id: number): Promise<MedicalRecord> {
  const response = await api.get<{ data: MedicalRecord }>(
    `/medical-records/${id}`,
  );
  return response.data.data;
}

export async function createMedicalRecord(
  data: Partial<MedicalRecord> & {
    patient_id: number;
    doctor_id: number;
    date: string;
    content: string;
  },
): Promise<MedicalRecord> {
  const response = await api.post<{ data: MedicalRecord }>(
    "/medical-records",
    data,
  );
  return response.data.data;
}

export async function updateMedicalRecord(
  id: number,
  data: Partial<MedicalRecord>,
): Promise<MedicalRecord> {
  const response = await api.put<{ data: MedicalRecord }>(
    `/medical-records/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteMedicalRecord(id: number): Promise<void> {
  await api.delete(`/medical-records/${id}`);
}
