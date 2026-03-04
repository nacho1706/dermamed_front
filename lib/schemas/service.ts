import { z } from "zod";
import { PaginationMetaSchema } from "./user";

export const ServiceSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.union([z.number(), z.string().transform((v) => Number(v))]),
  duration_minutes: z.union([
    z.number(),
    z.string().transform((v) => Number(v)),
  ]),
  doctor_commission_percentage: z
    .union([z.number(), z.string().transform((v) => Number(v))])
    .nullable()
    .optional(),
});

export type ValidatedService = z.infer<typeof ServiceSchema>;

export const PaginatedServicesSchema = z.object({
  data: z.array(ServiceSchema),
  links: z.object({
    first: z.string().nullable(),
    last: z.string().nullable(),
    prev: z.string().nullable(),
    next: z.string().nullable(),
  }),
  meta: PaginationMetaSchema,
});
