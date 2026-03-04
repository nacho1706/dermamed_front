import { z } from "zod";

export const RoleSchema = z.object({
  id: z.number(),
  name: z.enum(["clinic_manager", "doctor", "receptionist"]),
});

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  email: z.string().email(),
  cuit: z.string().nullable(),
  specialty: z.string().nullable(),
  roles: z.array(RoleSchema),
  is_active: z.union([
    z.boolean(),
    z.number().transform((v) => v === 1),
    z.string().transform((v) => v === "1" || v === "true"),
  ]),
  status: z.enum(["active", "pending_activation"]).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ValidatedUser = z.infer<typeof UserSchema>;
export type ValidatedRole = z.infer<typeof RoleSchema>;

// Generic Pagination Meta Schema
export const PaginationMetaSchema = z.object({
  current_page: z.number(),
  from: z.number().nullable(),
  last_page: z.number(),
  per_page: z.number(),
  to: z.number().nullable(),
  total: z.number(),
  path: z.string(),
  links: z.array(
    z.object({
      url: z.string().nullable(),
      label: z.string(),
      active: z.boolean(),
    }),
  ),
});

export const PaginatedUsersSchema = z.object({
  data: z.array(UserSchema),
  links: z.object({
    first: z.string().nullable(),
    last: z.string().nullable(),
    prev: z.string().nullable(),
    next: z.string().nullable(),
  }),
  meta: PaginationMetaSchema,
});
