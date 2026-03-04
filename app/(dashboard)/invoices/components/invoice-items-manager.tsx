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
import type { Product, Service, User } from "@/types";

interface InvoiceItemsManagerProps {
  products: Product[];
  services: Service[];
  doctors: User[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}

export function InvoiceItemsManager({
  products,
  services,
  doctors,
}: InvoiceItemsManagerProps) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: "items",
  });

  const handleTypeChange = (index: number, type: "product" | "service") => {
    setValue(`items.${index}.type`, type);
    setValue(`items.${index}.description`, "");
    setValue(`items.${index}.unit_price`, 0);
    setValue(`items.${index}.product_id`, null);
    setValue(`items.${index}.service_id`, null);
    setValue(`items.${index}.executor_doctor_id`, null);
  };

  const handleProductSelect = (index: number, productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setValue(`items.${index}.product_id`, product.id);
      setValue(`items.${index}.description`, product.name);
      setValue(`items.${index}.unit_price`, product.price);
    }
  };

  const handleServiceSelect = (index: number, serviceId: number) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setValue(`items.${index}.service_id`, service.id);
      setValue(`items.${index}.description`, service.name);
      setValue(`items.${index}.unit_price`, service.price);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <h3 className="text-base font-semibold text-foreground">
        Items de Facturación
      </h3>

      {itemFields.map((field, index) => {
        const type = watch(`items.${index}.type`);
        return (
          <div
            key={field.id}
            className="bg-surface-secondary/20 border border-border/50 p-4 rounded-lg space-y-4 relative"
          >
            <div className="absolute top-2 right-2">
              {itemFields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="text-muted hover:text-danger p-2 h-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-6">
              <FormField
                control={control}
                name={`items.${index}.type`}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        formField.onChange(val);
                        handleTypeChange(index, val as "product" | "service");
                      }}
                      value={formField.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="service">Servicio</SelectItem>
                        <SelectItem value="product">Producto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 space-y-2">
                <FormLabel>Elemento</FormLabel>
                {type === "product" ? (
                  <FormField
                    control={control}
                    name={`items.${index}.product_id`}
                    render={({ field: formField }) => (
                      <FormItem>
                        <Select
                          onValueChange={(val) =>
                            handleProductSelect(index, parseInt(val))
                          }
                          value={formField.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar producto..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name} (Stock: {p.stock})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={control}
                    name={`items.${index}.service_id`}
                    render={({ field: formField }) => (
                      <FormItem>
                        <Select
                          onValueChange={(val) =>
                            handleServiceSelect(index, parseInt(val))
                          }
                          value={formField.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar servicio..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {services.map((s) => (
                              <SelectItem key={s.id} value={s.id.toString()}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {type === "service" && (
                <FormField
                  control={control}
                  name={`items.${index}.executor_doctor_id`}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>Médico *</FormLabel>
                      <Select
                        onValueChange={(val) => formField.onChange(val)}
                        value={formField.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Médico ejecutor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {doctors.map((user) => (
                            <SelectItem
                              key={user.id}
                              value={user.id.toString()}
                            >
                              {user.first_name || user.name} {user.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={control}
                name={`items.${index}.description`}
                render={({ field: formField }) => (
                  <FormItem
                    className={
                      type === "service" ? "md:col-span-4" : "md:col-span-1"
                    }
                  >
                    <FormLabel>Descripción Custom</FormLabel>
                    <FormControl>
                      <Input
                        {...formField}
                        placeholder="Descripción extra..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`items.${index}.quantity`}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Cant.</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...formField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`items.${index}.unit_price`}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Precio Unit. ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...formField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col justify-end">
                <FormLabel className="invisible">Total</FormLabel>
                <div className="h-10 flex items-center font-bold">
                  {formatCurrency(
                    (watch(`items.${index}.quantity`) || 0) *
                      (watch(`items.${index}.unit_price`) || 0),
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          appendItem({
            type: "service",
            description: "",
            quantity: 1,
            unit_price: 0,
            product_id: null,
            service_id: null,
            executor_doctor_id: null,
          } as any)
        }
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" /> Agregar Item
      </Button>

      {errors.items?.root && (
        <p className="text-sm font-medium text-danger text-center">
          {errors.items.root.message as string}
        </p>
      )}
    </div>
  );
}
