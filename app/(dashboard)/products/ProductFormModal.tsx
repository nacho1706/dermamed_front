"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct, updateProduct, getBrands } from "@/services/products";
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
import type { Product } from "@/types";

// ─── Select styling ─────────────────────────────────────────────────────────

const selectClass =
  "w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-border bg-surface hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all";

// ─── Component ──────────────────────────────────────────────────────────────

export function ProductFormModal({
  isOpen,
  onClose,
  product,
}: {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [minStock, setMinStock] = useState(
    product?.min_stock?.toString() || "",
  );
  const [brandId, setBrandId] = useState(product?.brand_id?.toString() || "");

  // ── Fetch brands ────────────────────────────────────────────────────────
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
    staleTime: 60_000,
  });

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName(product?.name || "");
      setDescription(product?.description || "");
      setPrice(product?.price?.toString() || "");
      setMinStock(product?.min_stock?.toString() || "");
      setBrandId(product?.brand_id?.toString() || "");
    }
  }, [isOpen, product]);

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      sileo.success({
        title: "Producto creado",
        description: "El producto fue creado correctamente.",
      });
      onClose();
    },
    onError: () =>
      sileo.error({
        title: "Error",
        description: "No se pudo crear el producto.",
      }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      sileo.success({
        title: "Producto actualizado",
        description: "Los cambios fueron guardados correctamente.",
      });
      onClose();
    },
    onError: () =>
      sileo.error({
        title: "Error",
        description: "No se pudo actualizar el producto.",
      }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Partial<Product> = {
      name,
      description: description || undefined,
      price: parseFloat(price),
      min_stock: parseInt(minStock, 10),
      brand_id: brandId ? parseInt(brandId, 10) : null,
    };

    if (isEdit && product) {
      updateMut.mutate({ id: product.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Nombre *
            </label>
            <Input
              placeholder="Ej: Protector Solar SPF 50"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Descripción
            </label>
            <Input
              placeholder="Descripción del producto"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Brand */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Marca
            </label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
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

          {/* Price / Min Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Precio *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !name || !price}>
              {isPending ? (
                <Spinner size="sm" />
              ) : isEdit ? (
                "Guardar Cambios"
              ) : (
                "Crear Producto"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
