// ─── Generic API Types ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    path: string;
    links: { url: string | null; label: string; active: boolean }[];
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_id?: number;
}

export interface InviteUserRequest {
  name: string;
  email: string;
  role_ids: number[];
  specialty?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface TokenResponse {
  token: string;
}

// ─── Entity Types ───────────────────────────────────────────────────────────

export interface Role {
  id: number;
  name: "clinic_manager" | "doctor" | "receptionist";
}

export interface User {
  id: number;
  name: string;
  email: string;
  cuit: string | null;
  specialty: string | null;
  roles: Role[];
  is_active: boolean;
  status: "active" | "pending_activation";
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string; // Calculated in backend resource
  dni: string;
  cuit: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  street: string | null;
  street_number: string | null;
  floor: string | null;
  apartment: string | null;
  city: string | null;
  province: string | null;
  zip_code: string | null;
  country: string | null;
  full_address: string | null; // Computed by backend
  insurance_provider: string | null;
  created_at?: string;
}

export type AppointmentStatus =
  | "scheduled"
  | "in_waiting_room"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "pending"
  | "confirmed";

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  service_id: number;
  scheduled_start_at: string;
  scheduled_end_at: string;
  status: AppointmentStatus;
  check_in_at?: string;
  real_start_at?: string;
  real_end_at?: string;
  reserve_channel: "whatsapp" | "manual" | "web" | null;
  notes: string | null;
  patient?: Patient;
  doctor?: User;
  service?: Service;
  medical_record?: MedicalRecord;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
}

export interface MedicalRecord {
  id: number;
  date: string;
  content: string;
  patient?: Patient;
  doctor?: User;
  appointment?: Appointment;
  created_at: string;
  updated_at: string;
}

export interface DoctorAvailability {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  doctor?: User;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  quantity: number;
  type: "in" | "out";
  reason: string | null;
  product?: Product;
  user?: User;
  created_at: string;
}

export interface Invoice {
  id: number;
  patient_id: number;
  voucher_type_id: number;
  total: number;
  status: string;
  patient?: Patient;
  voucher_type?: VoucherType;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface InvoicePayment {
  id: number;
  invoice_id: number;
  payment_method_id: number;
  amount: number;
  payment_method?: PaymentMethod;
  created_at: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
}

export interface VoucherType {
  id: number;
  name: string;
}

// ─── Query Parameter Types ──────────────────────────────────────────────────

export interface PaginationParams {
  cantidad?: number;
  pagina?: number;
}

export interface PatientFilters extends PaginationParams {
  first_name?: string;
  last_name?: string;
  dni?: string;
  cuit?: string;
  search?: string;
}

export interface AppointmentFilters extends PaginationParams {
  doctor_id?: number;
  patient_id?: number;
  status?: AppointmentStatus;
  date_from?: string;
  date_to?: string;
}
