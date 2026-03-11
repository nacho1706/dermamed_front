import React from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { PaymentMethod } from "@/types";

interface InvoicePaymentMethodsProps {
  paymentMethods: PaymentMethod[];
  subtotal: number;
  totalPaid: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}

export function InvoicePaymentMethods({
  paymentMethods,
  subtotal,
  totalPaid,
}: InvoicePaymentMethodsProps) {
  const { control, watch } = useFormContext();

  const {
    fields: paymentFields,
    append: appendPayment,
    remove: removePayment,
  } = useFieldArray({
    control,
    name: "payments",
  });

  return (
    <div className="space-y-4 pt-6 border-t">
      <h3 className="text-base font-semibold text-foreground">
        Pagos Recibidos (Opcional)
      </h3>

      {paymentFields.map((field, index) => (
        <div
          key={field.id}
          className="grid grid-cols-[1fr_140px_40px] items-end gap-3 bg-surface-secondary/10 p-3 rounded-lg"
        >
          {/* Método de Pago */}
          <FormField
            control={control}
            name={`payments.${index}.payment_method_id`}
            render={({ field: formField }) => (
              <FormItem className="space-y-1">
                <FormLabel>Método de Pago</FormLabel>
                <Select
                  onValueChange={(val) => formField.onChange(parseInt(val))}
                  value={
                    formField.value ? formField.value.toString() : undefined
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentMethods?.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id.toString()}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Monto */}
          <FormField
            control={control}
            name={`payments.${index}.amount`}
            render={({ field: formField }) => {
              const methodId = watch(`payments.${index}.payment_method_id`);
              const isCash = paymentMethods
                ?.find((m) => m.id === methodId)
                ?.name?.toLowerCase()
                .includes("efectivo");
              return (
                <FormItem className="space-y-1">
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={
                        isCash
                          ? undefined
                          : subtotal > 0
                            ? subtotal
                            : undefined
                      }
                      {...formField}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Trash */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => removePayment(index)}
            className="h-9 w-9 p-0 text-muted hover:text-danger self-end"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}

      {paymentFields.length === 0 && (
        <p className="text-sm text-muted italic">
          Sin pagos iniciales. Se registrará como pendiente.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          appendPayment({
            payment_method_id: "",
            amount: subtotal - totalPaid > 0 ? subtotal - totalPaid : 0,
          } as any)
        }
      >
        <Plus className="w-4 h-4 mr-2" /> Agregar Pago
      </Button>
    </div>
  );
}
