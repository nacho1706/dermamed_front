import { z } from "zod";
import { UserSchema, PaginationMetaSchema } from "./user";
import { ServiceSchema } from "./service";
import { PatientSchema } from "./patient";

export const AppointmentStatusSchema = z.enum([
  "scheduled",
  "in_waiting_room",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "pending",
  "confirmed",
]);

export const MedicalRecordSchema = z.object({
  id: z.number(),
  date: z.string(),
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const AppointmentSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  doctor_id: z.number(),
  service_id: z.number(),
  scheduled_start_at: z.string(),
  scheduled_end_at: z.string(),
  status: AppointmentStatusSchema,
  check_in_at: z.string().optional(),
  real_start_at: z.string().optional(),
  real_end_at: z.string().optional(),
  reserve_channel: z.enum(["whatsapp", "manual", "web"]).nullable(),
  is_overbook: z.boolean().optional(),
  notes: z.string().nullable(),
  patient: PatientSchema.optional(),
  doctor: UserSchema.optional(),
  service: ServiceSchema.optional(),
  medical_record: MedicalRecordSchema.optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type ValidatedAppointment = z.infer<typeof AppointmentSchema>;

export const PaginatedAppointmentsSchema = z.object({
  data: z.array(AppointmentSchema),
  links: z.object({
    first: z.string().nullable(),
    last: z.string().nullable(),
    prev: z.string().nullable(),
    next: z.string().nullable(),
  }),
  meta: PaginationMetaSchema,
});
