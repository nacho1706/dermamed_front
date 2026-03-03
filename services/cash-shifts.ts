import api from "@/lib/api";
import type { CashShift } from "@/types";

export async function getCurrentCashShift(): Promise<CashShift | null> {
    try {
        const response = await api.get<{ data: CashShift | null }>("/cash-shifts/current");
        return response.data.data;
    } catch (error) {
        console.error("Error fetching current cash shift", error);
        return null;
    }
}

export async function openCashShift(openingBalance: number): Promise<CashShift> {
    const response = await api.post<{ data: CashShift }>("/cash-shifts/open", {
        opening_balance: openingBalance,
    });
    return response.data.data;
}

export async function closeCashShift(closingBalance: number): Promise<CashShift> {
    const response = await api.post<{ data: CashShift }>("/cash-shifts/close", {
        closing_balance: closingBalance,
    });
    return response.data.data;
}

export async function getCashShifts(params?: { pagina?: number }): Promise<any> {
    const response = await api.get("/cash-shifts", { params: { page: params?.pagina } });
    return response.data;
}
