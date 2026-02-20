/**
 * Timezone utilities for DermaMED
 *
 * Backend stores all dates in UTC.
 * Frontend converts to/from the clinic's local timezone for display and input.
 */
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const CLINIC_TIMEZONE = "America/Argentina/Buenos_Aires";

/**
 * Convert a local date + time string to a UTC datetime string for the API.
 * @param dateStr - "2026-02-18"
 * @param timeStr - "14:30"
 * @returns "2026-02-18 17:30:00" (UTC)
 */
export function localToUTC(dateStr: string, timeStr: string): string {
  // Build a date object that represents the local time in the clinic timezone
  const localDatetime = new Date(`${dateStr}T${timeStr}:00`);
  const utcDate = fromZonedTime(localDatetime, CLINIC_TIMEZONE);

  // Format as YYYY-MM-DD HH:mm:ss (what the backend expects)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${utcDate.getUTCFullYear()}-${pad(utcDate.getUTCMonth() + 1)}-${pad(utcDate.getUTCDate())} ${pad(utcDate.getUTCHours())}:${pad(utcDate.getUTCMinutes())}:${pad(utcDate.getUTCSeconds())}`;
}

/**
 * Format an ISO string (UTC) to a localized date string.
 * @param isoString - "2026-02-18T17:30:00+00:00"
 * @returns "18/02/2026"
 */
export function formatLocalDate(isoString: string): string {
  return formatInTimeZone(parseISO(isoString), CLINIC_TIMEZONE, "dd/MM/yyyy", {
    locale: es,
  });
}

/**
 * Format an ISO string (UTC) to localized time.
 * @param isoString - "2026-02-18T17:30:00+00:00"
 * @returns "14:30"
 */
export function formatLocalTime(isoString: string): string {
  return formatInTimeZone(parseISO(isoString), CLINIC_TIMEZONE, "HH:mm", {
    locale: es,
  });
}

/**
 * Format an ISO string (UTC) to full localized date and time.
 * @param isoString - "2026-02-18T17:30:00+00:00"
 * @returns "18/02/2026 14:30"
 */
export function formatLocalDateTime(isoString: string): string {
  return formatInTimeZone(
    parseISO(isoString),
    CLINIC_TIMEZONE,
    "dd/MM/yyyy HH:mm",
    { locale: es },
  );
}

/**
 * Extract local time from an ISO string (UTC).
 * Returns in HH:mm format suitable for <input type="time" />.
 * @param isoString - "2026-02-18T17:30:00+00:00"
 * @returns "14:30"
 */
export function extractLocalTime(isoString: string): string {
  return formatInTimeZone(parseISO(isoString), CLINIC_TIMEZONE, "HH:mm");
}

/**
 * Extract local date from an ISO string (UTC).
 * Returns in YYYY-MM-DD format suitable for <input type="date" />.
 * @param isoString - "2026-02-18T17:30:00+00:00"
 * @returns "2026-02-18"
 */
export function extractLocalDate(isoString: string): string {
  return formatInTimeZone(parseISO(isoString), CLINIC_TIMEZONE, "yyyy-MM-dd");
}
