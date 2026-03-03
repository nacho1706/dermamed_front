import { z } from "zod";
import { PaginationMetaSchema } from "./user";

export const ServiceSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  duration_minutes: z.number(),
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
