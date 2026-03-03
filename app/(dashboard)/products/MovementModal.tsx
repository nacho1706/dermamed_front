"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { sileo } from "sileo";
import {
  createProduct,
  createStockMovement,
  getBrands,
  getProducts,
  type StockMovementInput,
} from "@/services/products";
import type { Product } from "@/types";
import {
  Package,
  Plus,
  Search,
  X,
  Loader2,
  Check,
  ChevronLeft,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  FilterableSelect,
  type FilterableSelectOption,
} from "@/components/shared/filterable-select";

// ─── Select styling ─────────────────────────────────────────────────────────
const selectClass =
  "w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-border bg-surface hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all";

// ─── Zod Schema ──────────────────────────────────────────────────────────────
const movementSchema = z
  .object({
    productId: z.number().nullable(),
    newProductName: z.string().optional(),
    type: z.enum(["in", "out", "adjustment"]),
    reason: z.string().min(1, "Selecciona un motivo"),
    quantity: z.number().nonnegative(),
    notes: z.string().optional(),
    // Product creation fields
    description: z.string().optional(),
    price: z.number().optional(),
    minStock: z.number().optional(),
    brandId: z.number().nullable().optional(),
    _is_creating_product: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.quantity < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cantidad no puede ser negativa",
        path: ["quantity"],
      });
    }
    if (data.type !== "adjustment" && data.quantity < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cantidad debe ser mayor a 0",
        path: ["quantity"],
      });
    }
    if (data._is_creating_product) {
      if (!data.newProductName?.trim()) {
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
    } else if (!data.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona un producto",
        path: ["productId"],
      });
    }
  });

type MovementFormValues = z.infer<typeof movementSchema>;

// ─── Inline Product Search Combobox ─────────────────────────────────────────
function ProductCombobox({
  value,
  onSelect,
  onCreateRequest,
  disabled,
}: {
  value: number | null;
  onSelect: (product: Product) => void;
  onCreateRequest: (searchText: string) => void;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const debouncedSearch = useDebounce(inputValue, 350);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync: if value cleared externally, reset
  useEffect(() => {
    if (!value) {
      setSelectedProduct(null);
      setIsOpen(false);
    }
  }, [value]);

  const { data, isLoading } = useQuery({
    queryKey: ["products-search-combobox", debouncedSearch],
    queryFn: () => getProducts({ name: debouncedSearch, cantidad: 10 }),
    enabled: debouncedSearch.length >= 2,
    select: (r) => r.data,
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setInputValue("");
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleSelect = useCallback(
    (product: Product) => {
      setSelectedProduct(product);
      onSelect(product);
      setInputValue("");
      setIsOpen(false);
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    setSelectedProduct(null);
    setInputValue("");
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // ─── Selected state ─────────────────────────────────────────────────
  if (selectedProduct && !isOpen) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-[var(--radius-md)]",
          "bg-surface border border-border",
          "transition-all duration-150",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:border-[var(--border-hover)]",
        )}
        onClick={disabled ? undefined : handleClear}
        title="Clic para cambiar"
      >
        <Package className="h-4 w-4 text-brand-500 shrink-0" />
        <span className="flex-1 min-w-0 truncate text-foreground">
          {selectedProduct.name}
        </span>
        <span className="text-xs text-muted shrink-0">
          Stock: {selectedProduct.stock}
        </span>
        {!disabled && <X className="h-3.5 w-3.5 shrink-0 text-muted" />}
      </div>
    );
  }

  // ─── Search state ─────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          "flex items-center gap-2 px-3 rounded-[var(--radius-md)]",
          "bg-surface border border-border",
          "hover:border-[var(--border-hover)] transition-all duration-150",
          isOpen && "ring-2 ring-brand-500/20 border-brand-500",
        )}
      >
        <Search className="h-4 w-4 text-muted shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar producto por nombre..."
          disabled={disabled}
          className="flex-1 min-w-0 py-2 text-sm bg-transparent placeholder:text-muted-foreground disabled:cursor-not-allowed focus:outline-none focus-visible:outline-none focus:ring-0"
          style={{ outline: "none", boxShadow: "none" }}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="h-4 w-4 text-muted animate-spin shrink-0" />
        )}
      </div>

      {isOpen && inputValue.length > 0 && (
        <div
          className={cn(
            "absolute z-[100] mt-1 w-full rounded-[var(--radius-md)]",
            "bg-surface border border-border shadow-[var(--shadow-md)]",
            "max-h-[260px] overflow-y-auto",
            "animate-in fade-in-0 zoom-in-95 duration-100",
          )}
        >
          {debouncedSearch.length < 2 ? (
            <div className="p-3 text-sm text-center text-muted">
              Escribí al menos 2 caracteres...
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 p-3">
              <Loader2 className="h-4 w-4 text-muted animate-spin" />
              <span className="text-sm text-muted">Buscando...</span>
            </div>
          ) : (
            <ul className="p-1">
              {data && data.length > 0
                ? data.map((product) => (
                    <li
                      key={product.id}
                      onClick={() => handleSelect(product)}
                      className="flex items-center gap-2 px-2.5 py-2.5 text-sm rounded-[var(--radius-sm)] cursor-pointer hover:bg-surface-secondary transition-colors"
                    >
                      <Package className="h-4 w-4 text-muted shrink-0" />
                      <span className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground truncate">
                          {product.name}
                        </span>
                        <span className="text-xs text-muted">
                          Stock: {product.stock} · Mín: {product.min_stock}
                        </span>
                      </span>
                    </li>
                  ))
                : null}

              {data && data.length > 0 && (
                <li className="h-px bg-border/50 my-1 mx-1" />
              )}

              {/* Fixed "Create" option */}
              <li
                onClick={() => {
                  setIsOpen(false);
                  setInputValue("");
                  onCreateRequest(debouncedSearch || inputValue);
                }}
                className="flex items-center gap-2 px-2.5 py-2.5 text-sm rounded-[var(--radius-sm)] cursor-pointer transition-colors text-brand-600 hover:bg-brand-50"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="font-medium truncate">
                  Crear producto{" "}
                  {debouncedSearch ? `"${debouncedSearch}"` : "nuevo"}
                </span>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
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
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);

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
      _is_creating_product: false,
    },
  });

  const {
    watch,
    setValue,
    handleSubmit,
    reset,
    register,
    control,
    formState: { errors },
  } = form;

  const currentType = watch("type");
  const currentProductId = watch("productId");

  // Keep hidden flag in sync
  useEffect(() => {
    setValue("_is_creating_product", isCreatingProduct);
  }, [isCreatingProduct, setValue]);

  // Fetch brands when creating
  useEffect(() => {
    if (isCreatingProduct && brands.length === 0) {
      getBrands().then(setBrands).catch(console.error);
    }
  }, [isCreatingProduct, brands.length]);

  // Reset on open
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
        _is_creating_product: false,
      });
      setIsCreatingProduct(false);
    }
  }, [isOpen, preselectedProduct, reset]);

  // Clear reason when type changes
  useEffect(() => {
    setValue("reason", "");
  }, [currentType, setValue]);

  // Mutations
  const createProductMut = useMutation({ mutationFn: createProduct });
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
  });

  const onSubmit = async (data: MovementFormValues) => {
    try {
      let targetProductId = data.productId;

      if (isCreatingProduct && data.newProductName) {
        if (data.price === undefined || data.minStock === undefined) return;
        const created = await createProductMut.mutateAsync({
          name: data.newProductName,
          description: data.description || undefined,
          price: data.price,
          min_stock: data.minStock,
          brand_id: data.brandId || null,
          stock: 0,
        });
        targetProductId = created.id;
      }

      if (!targetProductId) throw new Error("No product ID resolved");

      const movementData: StockMovementInput = {
        product_id: targetProductId,
        user_id: userId,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
      };

      await moveStockMut.mutateAsync(movementData);
    } catch (error: any) {
      // Intercept Axios errors so the modal never crashes
      const status = error?.response?.status;
      const serverMessage =
        error?.response?.data?.message ||
        (error?.response?.data?.errors
          ? Object.values(error.response.data.errors).flat().join(" ")
          : null);

      if (status === 422) {
        sileo.error({
          title: "Operación denegada",
          description:
            serverMessage ??
            "El stock no puede quedar en negativo. Revisá la cantidad ingresada.",
        });
        return;
      }

      console.error(error);
      sileo.error({
        title: "Error",
        description: serverMessage ?? "No se pudo registrar el movimiento.",
      });
    }
  };

  const isPending = createProductMut.isPending || moveStockMut.isPending;

  const getReasonOptions = (): FilterableSelectOption[] => {
    if (currentType === "in")
      return [{ value: "supplier_purchase", label: "Compra a Proveedor" }];
    if (currentType === "out")
      return [
        { value: "patient_sale", label: "Venta a Paciente" },
        { value: "internal_use", label: "Uso en Consultorio" },
      ];
    if (currentType === "adjustment")
      return [
        { value: "inventory_correction", label: "Corrección de Inventario" },
        { value: "loss", label: "Pérdida / Caducidad" },
      ];
    return [];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle>Registrar Movimiento de Stock</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5 py-3">
            {/* Product selection */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                Producto
              </Label>

              {/* Preselected product chip */}
              {preselectedProduct ? (
                <div className="flex items-center gap-3 bg-surface-secondary p-3 rounded-[var(--radius-md)] border border-border">
                  <div className="w-9 h-9 rounded bg-brand-50 flex items-center justify-center shrink-0">
                    <Package className="w-4 w-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {preselectedProduct.name}
                    </p>
                    <p className="text-xs text-muted">
                      Stock actual: {preselectedProduct.stock} · Mín:{" "}
                      {preselectedProduct.min_stock}
                    </p>
                  </div>
                </div>
              ) : !isCreatingProduct ? (
                /* Search combobox */
                <ProductCombobox
                  value={currentProductId}
                  onSelect={(product) => setValue("productId", product.id)}
                  onCreateRequest={(searchText) => {
                    setIsCreatingProduct(true);
                    setValue("productId", null);
                    setValue("newProductName", searchText);
                  }}
                />
              ) : null}

              {(errors as any).productId && !isCreatingProduct && (
                <p className="text-xs text-danger font-medium">
                  {(errors as any).productId.message}
                </p>
              )}

              {/* Inline product creation form */}
              {isCreatingProduct && (
                <div
                  className={cn(
                    "rounded-[var(--radius-md)] border border-brand-200 bg-brand-50/40 p-4 space-y-3",
                    "animate-in slide-in-from-top-2 duration-200",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-brand-600" />
                      <span className="text-sm font-semibold text-brand-700">
                        Nuevo Producto
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingProduct(false);
                        setValue("newProductName", "");
                        setValue("productId", null);
                      }}
                      className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Buscar existente
                    </button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Nombre *</Label>
                    <Input
                      {...register("newProductName")}
                      placeholder="Ej: Crema Hidratante X"
                      className="h-9 text-sm"
                    />
                    {errors.newProductName && (
                      <p className="text-[11px] text-danger">
                        {errors.newProductName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">
                      Descripción{" "}
                      <span className="text-muted font-normal">(opcional)</span>
                    </Label>
                    <Input
                      {...register("description")}
                      placeholder="Descripción breve"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Precio *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register("price", { valueAsNumber: true })}
                        className="h-9 text-sm"
                        placeholder="0.00"
                      />
                      {errors.price && (
                        <p className="text-[11px] text-danger">
                          {errors.price.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stock Mínimo *</Label>
                      <Input
                        type="number"
                        {...register("minStock", { valueAsNumber: true })}
                        className="h-9 text-sm"
                        placeholder="0"
                      />
                      {errors.minStock && (
                        <p className="text-[11px] text-danger">
                          {errors.minStock.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">
                      Marca{" "}
                      <span className="text-muted font-normal">(opcional)</span>
                    </Label>
                    <Controller
                      name="brandId"
                      control={control}
                      render={({ field }) => (
                        <FilterableSelect
                          value={field.value}
                          onChange={(val) =>
                            field.onChange(val ? Number(val) : null)
                          }
                          options={brands.map((b) => ({
                            label: b.name,
                            value: b.id,
                          }))}
                          placeholder="Sin marca"
                          searchPlaceholder="Buscar marca..."
                        />
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Movement type + quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  Tipo *
                </Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <FilterableSelect
                      value={field.value}
                      onChange={(val) => field.onChange(val as string)}
                      options={[
                        { value: "in", label: "Ingreso (+)" },
                        { value: "out", label: "Retiro (-)" },
                        { value: "adjustment", label: "Ajuste (±)" },
                      ]}
                      placeholder="Seleccionar tipo..."
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  {currentType === "adjustment"
                    ? "Stock Real Actual *"
                    : "Cantidad *"}
                </Label>
                <Input
                  type="number"
                  min={currentType === "adjustment" ? "0" : "1"}
                  {...register("quantity", { valueAsNumber: true })}
                />
                {errors.quantity && (
                  <p className="text-xs text-danger mt-1">
                    {errors.quantity.message}
                  </p>
                )}
                {currentType === "adjustment" && (
                  <p className="text-xs text-blue-600 mt-1">
                    Este número reemplazará el stock actual directamente.
                  </p>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                Motivo *
              </Label>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <FilterableSelect
                    value={field.value}
                    onChange={(val) => field.onChange(val as string)}
                    options={getReasonOptions()}
                    placeholder="Selecciona un motivo..."
                    disabled={!currentType}
                  />
                )}
              />
              {errors.reason && (
                <p className="text-xs text-danger mt-1">
                  {errors.reason.message}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                Notas <span className="text-muted font-normal">(Opcional)</span>
              </Label>
              <textarea
                {...register("notes")}
                className={`${selectClass} min-h-[80px] resize-none`}
                placeholder="Justificación del movimiento..."
              />
            </div>
          </div>

          {/* Pinned footer */}
          <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0 flex justify-end gap-3">
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
              disabled={
                isPending ||
                (!currentProductId && !isCreatingProduct && !preselectedProduct)
              }
            >
              {isPending ? (
                <Spinner size="sm" />
              ) : isCreatingProduct ? (
                "Crear y Registrar"
              ) : (
                "Registrar Movimiento"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
