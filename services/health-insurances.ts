import api from "@/lib/api";
import type { HealthInsurance } from "@/types";

export async function getHealthInsurances(): Promise<HealthInsurance[]> {
  const response = await api.get<{ data: HealthInsurance[] }>(
    "/health-insurances",
  );
  return response.data.data;
}
