"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { sileo } from "sileo";
import {
  createProduct,
  createStockMovement,
  getBrands,
  type StockMovementInput,
} from "@/services/products";
import type { Product } from "@/types";
import { Package, Plus } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

// ─── Select styling ─────────────────────────────────────────────────────────
const selectClass =
  "w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-border bg-surface hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all";

// ─── Zod Schema with Conditional Validation ─────────────────────────────────
const movementSchema = z
  .object({
    productId: z.number().nullable(),
    newProductName: z.string().optional(),
    type: z.enum(["in", "out", "adjustment"]),
    reason: z.string().min(1, "Selecciona un motivo"),
    quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
    notes: z.string().optional(),
    // Product creation fields
    description: z.string().optional(),
    price: z.number().optional(),
    minStock: z.number().optional(),
    brandId: z.number().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // If no product is selected, we are CREATING a new one.
    if (!data.productId) {
      if (!data.newProductName || data.newProductName.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del producto es requerido",
          path: ["newProductName"],
        });
      }
      if (data.price === undefined || isNaN(data.price)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El precio es requerido",
          path: ["price"],
        });
      }
      if (data.minStock === undefined || isNaN(data.minStock)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El stock mínimo es requerido",
          path: ["minStock"],
        });
      }
    }
  });

type MovementFormValues = z.infer<typeof movementSchema>;

// ─── Component ──────────────────────────────────────────────────────────────
export function MovementModal({
  isOpen,
  onClose,
  preselectedProduct,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  preselectedProduct?: Product;
  userId: number;
}) {
  const queryClient = useQueryClient();
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  // Search products
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["products-search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return [];
      const { getProducts } = await import("@/services/products");
      const res = await getProducts({ name: debouncedSearch, cantidad: 10 });
      return res.data;
    },
    enabled:
      debouncedSearch.length > 0 && !preselectedProduct && !isCreatingProduct,
  });

  // Fetch brands when creating product
  useEffect(() => {
    if (isCreatingProduct && brands.length === 0) {
      getBrands().then(setBrands).catch(console.error);
    }
  }, [isCreatingProduct, brands.length]);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      productId: preselectedProduct?.id || null,
      newProductName: "",
      type: "in",
      reason: "",
      quantity: 1,
      notes: "",
      description: "",
      price: undefined,
      minStock: undefined,
      brandId: null,
    },
  });

  const {
    watch,
    setValue,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = form;
  const currentType = watch("type");
  const currentProductId = watch("productId");

  // Reset form when modal opens/closes or preselected product changes
  useEffect(() => {
    if (isOpen) {
      reset({
        productId: preselectedProduct?.id || null,
        newProductName: "",
        type: "in",
        reason: "",
        quantity: 1,
        notes: "",
        description: "",
        price: undefined,
        minStock: undefined,
        brandId: null,
      });
      setIsCreatingProduct(false);
      setSearchQuery("");
    }
  }, [isOpen, preselectedProduct, reset]);

  // Adjust reason options based on type
  useEffect(() => {
    setValue("reason", "");
  }, [currentType, setValue]);

  // Mutations
  const createProductMut = useMutation({
    mutationFn: createProduct,
  });

  const moveStockMut = useMutation({
    mutationFn: createStockMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      sileo.success({
        title: "Movimiento registrado",
        description: "El stock ha sido actualizado correctamente.",
      });
      onClose();
    },
    onError: () => {
      sileo.error({
        title: "Error",
        description: "No se pudo registrar el movimiento.",
      });
    },
  });

  const onSubmit = async (data: MovementFormValues) => {
    try {
      let targetProductId = data.productId;

      // 1. Create product if necessary (Double Submit)
      if (!targetProductId && data.newProductName) {
        if (data.price === undefined || data.minStock === undefined) return;

        const newProductParam: Partial<Product> = {
          name: data.newProductName,
          description: data.description || undefined,
          price: data.price,
          min_stock: data.minStock,
          brand_id: data.brandId || null,
          stock: 0, // Initializes at 0, movement adds it
        };

        const createdProduct =
          await createProductMut.mutateAsync(newProductParam);
        targetProductId = createdProduct.id;
      }

      if (!targetProductId) throw new Error("No product ID resolved");

      // 2. Register Movement
      const movementData: StockMovementInput = {
        product_id: targetProductId,
        user_id: userId,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
      };

      await moveStockMut.mutateAsync(movementData);
    } catch (error) {
      console.error(error);
    }
  };

  const isPending = createProductMut.isPending || moveStockMut.isPending;

  // Render Reason Options
  const renderReasonOptions = () => {
    if (currentType === "in") {
      return (
        <>
          <option value="">Selecciona un motivo...</option>
          <option value="supplier_purchase">Compra a Proveedor</option>
          <option value="adjustment">Ajuste de Inventario</option>
        </>
      );
    }
    if (currentType === "out") {
      return (
        <>
          <option value="">Selecciona un motivo...</option>
          <option value="patient_sale">Venta a Paciente</option>
          <option value="internal_use">Uso en Consultorio</option>
          <option value="adjustment">Ajuste de Inventario</option>
        </>
      );
    }
    if (currentType === "adjustment") {
      return (
        <>
          <option value="">Selecciona un motivo...</option>
          <option value="sale">Venta</option>
          <option value="expiry">Caducidad</option>
          <option value="breakage">Rotura</option>
          <option value="internal_use_adj">Uso Interno</option>
        </>
      );
    }
    return <option value="">Selecciona un tipo primero...</option>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Movimiento de Stock</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-4">
          {/* Product Selection / Creation */}
          <div className="space-y-3 p-4 bg-surface-secondary rounded-[var(--radius-lg)] border border-border relative z-10">
            {!preselectedProduct && !isCreatingProduct ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">
                  Producto *
                </label>
                <Controller
                  name="productId"
                  control={control}
                  render={({ field }) => (
                    <Popover
                      open={isComboboxOpen}
                      onOpenChange={setIsComboboxOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isComboboxOpen}
                          className="w-full justify-between"
                        >
                          {field.value && searchResults
                            ? searchResults.find((p) => p.id === field.value)
                                ?.name || "Producto seleccionado"
                            : "Buscar producto..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[480px] p-0 bg-surface z-50"
                        align="start"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Escribe el nombre del producto..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {isSearching ? (
                                "Buscando..."
                              ) : searchQuery ? (
                                <div className="p-4 text-center">
                                  <p className="text-sm text-muted mb-3">
                                    No se encontró "{searchQuery}"
                                  </p>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                      setValue("newProductName", searchQuery);
                                      setIsCreatingProduct(true);
                                      setValue("productId", null);
                                      setIsComboboxOpen(false);
                                    }}
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Crear "{searchQuery}"
                                  </Button>
                                </div>
                              ) : (
                                "Escribe para buscar..."
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {searchResults?.map((product: any) => (
                                <CommandItem
                                  key={product.id}
                                  value={String(product.id)}
                                  onSelect={(val) => {
                                    field.onChange(Number(val));
                                    setIsComboboxOpen(false);
                                  }}
                                >
                                  {product.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
            ) : preselectedProduct ? (
              <div className="flex items-center gap-3 bg-surface p-3 rounded-[var(--radius-md)] border border-border">
                <div className="w-10 h-10 rounded bg-brand-50 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {preselectedProduct.name}
                  </p>
                  <p className="text-xs text-muted">
                    Stock actual: {preselectedProduct.stock} | Mín:{" "}
                    {preselectedProduct.min_stock}
                  </p>
                </div>
              </div>
            ) : (
              /* Creating New Product In-line */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-brand-600 flex items-center">
                    <Plus className="w-4 h-4 mr-1" /> Nuevo Producto
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => {
                      setIsCreatingProduct(false);
                      setValue("newProductName", "");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      Nombre *
                    </label>
                    <Input
                      {...form.register("newProductName")}
                      className="h-8 text-sm"
                    />
                    {errors.newProductName && (
                      <p className="text-xs text-danger mt-1">
                        {errors.newProductName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      Descripción
                    </label>
                    <Input
                      {...form.register("description")}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1">
                        Precio *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        {...form.register("price", { valueAsNumber: true })}
                        className="h-8 text-sm"
                      />
                      {errors.price && (
                        <p className="text-xs text-danger mt-1">
                          {errors.price.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1">
                        Stock Mínimo *
                      </label>
                      <Input
                        type="number"
                        {...form.register("minStock", { valueAsNumber: true })}
                        className="h-8 text-sm"
                      />
                      {errors.minStock && (
                        <p className="text-xs text-danger mt-1">
                          {errors.minStock.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      Marca
                    </label>
                    <select
                      {...form.register("brandId", {
                        setValueAs: (v) => (v === "" ? null : parseInt(v, 10)),
                      })}
                      className={selectClass}
                    >
                      <option value="">Sin marca</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
            {errors.productId && !isCreatingProduct && (
              <p className="text-xs text-danger">{errors.productId.message}</p>
            )}
          </div>

          {/* Movement Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Tipo *
              </label>
              <select {...form.register("type")} className={selectClass}>
                <option value="in">Ingreso (+)</option>
                <option value="out">Retiro (-)</option>
                <option value="adjustment">Ajuste (±)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Cantidad *
              </label>
              <Input
                type="number"
                min="1"
                {...form.register("quantity", { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="text-xs text-danger mt-1">
                  {errors.quantity.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Motivo *
            </label>
            <select {...form.register("reason")} className={selectClass}>
              {renderReasonOptions()}
            </select>
            {errors.reason && (
              <p className="text-xs text-danger mt-1">
                {errors.reason.message}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Notas (Opcional)
            </label>
            <textarea
              {...form.register("notes")}
              className={`${selectClass} min-h-[80px] resize-none`}
              placeholder="Justificación del movimiento..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || (!currentProductId && !isCreatingProduct)}
            >
              {isPending ? (
                <Spinner size="sm" />
              ) : isCreatingProduct ? (
                "Crear y Registrar"
              ) : (
                "Registrar Movimiento"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
