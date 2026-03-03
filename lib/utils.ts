import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to locale-friendly display
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format an Argentine phone number for human-readable display.
 * Input: E.164 format stored by backend  (+549XXXXXXXXXX, +54XXXXXXXXXX, etc.)
 * Output examples:
 *   +54 9 381 319 3874   (mobile — 10 digit with '9')
 *   +54 11 4444 5555     (landline — 10 digit without extra '9')
 *   +54 9 11 4444 5555   (mobile CABA)
 *   Raw string returned unchanged if pattern doesn't match.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";

  // Only transform standard Argentine E.164: +549... (mobile) or +54... (landline)
  const match = phone.match(/^\+549?(\d+)$/);
  if (!match) return phone; // international — return as-is

  const isMobile = phone.startsWith("+549");
  const digits = match[1]; // digits after +54 or +549

  if (isMobile) {
    if (digits.length === 10 && digits.startsWith("11")) {
      // CABA mobile: +54 9 11 XXXX XXXX
      return `+54 9 11 ${digits.slice(2, 6)} ${digits.slice(6)}`;
    }
    if (digits.length === 10) {
      // Interior mobile: +54 9 XXX XXX XXXX
      return `+54 9 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return `+54 9 ${digits}`;
  } else {
    if (digits.length === 10 && digits.startsWith("11")) {
      // CABA landline: +54 11 XXXX XXXX
      return `+54 11 ${digits.slice(2, 6)} ${digits.slice(6)}`;
    }
    if (digits.length === 10) {
      // Interior landline: +54 XXX XXXX XXXX
      return `+54 ${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
    }
    return `+54 ${digits}`;
  }
}

/**
 * Format a datetime string to locale-friendly display
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a time string (HH:mm)
 */
export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format currency for Argentina
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

/**
 * Get initials from a name (for avatars)
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Appointment status labels and colors
 */
export const APPOINTMENT_STATUS = {
  pending: { label: "Pendiente", color: "warning" },
  confirmed: { label: "Confirmado", color: "info" },
  cancelled: { label: "Cancelado", color: "danger" },
  attended: { label: "Atendido", color: "success" },
} as const;
