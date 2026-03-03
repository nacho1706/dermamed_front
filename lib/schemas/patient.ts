import { z } from "zod";
import { PaginationMetaSchema } from "./user";

export const PatientSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
  dni: z.string().nullable(),
  cuit: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  birth_date: z.string().nullable(),
  street: z.string().nullable(),
  street_number: z.string().nullable(),
  floor: z.string().nullable(),
  apartment: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  zip_code: z.string().nullable(),
  country: z.string().nullable(),
  full_address: z.string().nullable(),
  insurance_provider: z.string().nullable(),
  created_at: z.string().optional(),
});

export type ValidatedPatient = z.infer<typeof PatientSchema>;

export const PaginatedPatientsSchema = z.object({
  data: z.array(PatientSchema),
  links: z.object({
    first: z.string().nullable(),
    last: z.string().nullable(),
    prev: z.string().nullable(),
    next: z.string().nullable(),
  }),
  meta: PaginationMetaSchema,
});
