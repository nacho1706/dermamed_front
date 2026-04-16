import api from "@/lib/api";

export interface DashboardStats {
  kpis: {
    income: { value: number; variation: number };
    appointments: { value: number; variation: number };
    new_patients: { value: number; variation: number };
  };
  income_distribution: Array<{ name: string; total: number }>;
  weekly_flow: Array<{ date: string; scheduled: number; effective: number }>;
  low_stock: Array<{ id: number; name: string; stock: number; min_stock: number }>;
  predictive_alerts: Array<{ type: string; message: string; product_id: number }>;
}

export async function getDashboardStats() {
  const { data } = await api.get<DashboardStats>("/dashboard-stats");
  return data;
}
