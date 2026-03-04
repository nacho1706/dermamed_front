import * as z from "zod";

export const itemSchema = z
  .object({
    type: z.enum(["product", "service"]),
    product_id: z.coerce.number().optional().nullable(),
    service_id: z.coerce.number().optional().nullable(),
    executor_doctor_id: z.coerce.number().optional().nullable(),
    description: z.string().min(1, "Descripción requerida"),
    quantity: z.coerce.number().min(1, "Al menos 1"),
    unit_price: z.coerce.number().min(0, "Monto inválido"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "product" && !data.product_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleccione un producto",
        path: ["product_id"],
      });
    }
    if (data.type === "service") {
      if (!data.service_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Seleccione un servicio",
          path: ["service_id"],
        });
      }
      if (!data.executor_doctor_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Seleccione un médico",
          path: ["executor_doctor_id"],
        });
      }
    }
  });

export const paymentSchema = z.object({
  payment_method_id: z.coerce.number().min(1, "Método de pago requerido"),
  amount: z.coerce.number().min(0.01, "Monto inválido"),
});

export const invoiceSchema = z.object({
  patient_id: z.coerce.number().min(1, "Seleccione un paciente"),
  voucher_type_id: z.coerce.number().min(1, "Comprobante requerido"),
  items: z.array(itemSchema).min(1, "Agregue al menos un item"),
  payments: z.array(paymentSchema).optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
