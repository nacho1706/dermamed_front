import api from "@/lib/api";
import type { CashShift, CashExpense, CashExpensePayload } from "@/types";

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

export async function closeCashShift(closingBalance: number, justification?: string): Promise<CashShift> {
    const response = await api.post<{ data: CashShift }>("/cash-shifts/close", {
        closing_balance: closingBalance,
        justification: justification,
    });
    return response.data.data;
}

export async function getCashShifts(params?: { pagina?: number }): Promise<any> {
    const response = await api.get("/cash-shifts", { params: { page: params?.pagina } });
    return response.data;
}

export async function createExpense(data: CashExpensePayload): Promise<CashExpense> {
    const response = await api.post<{ data: CashExpense }>("/cash-expenses", data);
    return response.data.data;
}

/**
 * Fetch all expenses from the API, optionally filtered by date (YYYY-MM-DD).
 * This is the persistent source — works regardless of whether the shift is open or closed.
 */
export async function getExpenses(params?: { date?: string }): Promise<CashExpense[]> {
    const response = await api.get<{ data: CashExpense[] }>("/cash-expenses", {
        params: params?.date ? { date: params.date } : undefined,
    });
    return response.data.data ?? [];
}
