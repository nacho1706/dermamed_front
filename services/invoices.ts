import api from "@/lib/api";
import type {
  Invoice,
  InvoiceItem,
  InvoicePayment,
  PaginatedResponse,
  PaginationParams,
  PaymentMethod,
  VoucherType,
} from "@/types";

// ─── Filter Interfaces ──────────────────────────────────────────────────────

export interface InvoiceFilters extends PaginationParams {
  patient_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
}

// ─── Payment Methods & Voucher Types ────────────────────────────────────────

// Helper to get payment methods (hardcoded fallback if API fails or doesn't exist)
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const response = await api.get<{ data: PaymentMethod[] }>(
      "/payment-methods",
    );
    return response.data.data;
  } catch (error) {
    console.warn("Could not fetch payment methods, using defaults", error);
    return [
      { id: 1, name: "Efectivo" },
      { id: 2, name: "Tarjeta de Crédito" },
      { id: 3, name: "Tarjeta de Débito" },
      { id: 4, name: "Transferencia" },
      { id: 5, name: "Mercado Pago" },
    ];
  }
}

// Helper to get voucher types (hardcoded fallback)
export async function getVoucherTypes(): Promise<VoucherType[]> {
  try {
    const response = await api.get<{ data: VoucherType[] }>("/voucher-types");
    return response.data.data;
  } catch (error) {
    console.warn("Could not fetch voucher types, using defaults", error);
    return [
      { id: 1, name: "Factura A" },
      { id: 2, name: "Factura B" },
      { id: 3, name: "Factura C" },
      { id: 4, name: "Recibo X" },
    ];
  }
}

// ─── Invoices CRUD ──────────────────────────────────────────────────────────

export async function getInvoices(
  filters?: InvoiceFilters,
): Promise<PaginatedResponse<Invoice>> {
  const response = await api.get<PaginatedResponse<Invoice>>("/invoices", {
    params: filters,
  });
  return response.data;
}

export async function getInvoice(id: number): Promise<Invoice> {
  const response = await api.get<{ data: Invoice }>(`/invoices/${id}`);
  return response.data.data;
}

export async function createInvoice(data: Partial<Invoice>): Promise<Invoice> {
  const response = await api.post<{ data: Invoice }>("/invoices", data);
  return response.data.data;
}

export async function updateInvoice(
  id: number,
  data: Partial<Invoice>,
): Promise<Invoice> {
  const response = await api.put<{ data: Invoice }>(`/invoices/${id}`, data);
  return response.data.data;
}

export async function deleteInvoice(id: number): Promise<void> {
  await api.delete(`/invoices/${id}`);
}

// ─── Invoice Items ──────────────────────────────────────────────────────────

export async function addInvoiceItem(
  invoiceId: number,
  data: Partial<InvoiceItem>,
): Promise<InvoiceItem> {
  const response = await api.post<{ data: InvoiceItem }>(
    `/invoices/${invoiceId}/items`,
    data,
  );
  return response.data.data;
}

export async function updateInvoiceItem(
  invoiceId: number,
  itemId: number,
  data: Partial<InvoiceItem>,
): Promise<InvoiceItem> {
  const response = await api.put<{ data: InvoiceItem }>(
    `/invoices/${invoiceId}/items/${itemId}`,
    data,
  );
  return response.data.data;
}

export async function deleteInvoiceItem(
  invoiceId: number,
  itemId: number,
): Promise<void> {
  await api.delete(`/invoices/${invoiceId}/items/${itemId}`);
}

// ─── Invoice Payments ───────────────────────────────────────────────────────

export async function addInvoicePayment(
  invoiceId: number,
  data: Partial<InvoicePayment>,
): Promise<InvoicePayment> {
  const response = await api.post<{ data: InvoicePayment }>(
    `/invoices/${invoiceId}/payments`,
    data,
  );
  return response.data.data;
}

export async function deleteInvoicePayment(
  invoiceId: number,
  paymentId: number,
): Promise<void> {
  await api.delete(`/invoices/${invoiceId}/payments/${paymentId}`);
}
