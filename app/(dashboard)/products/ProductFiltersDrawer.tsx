"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getBrands } from "@/services/products";
import { Archive } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

// ─── Select styling (matches existing pattern) ─────────────────────────────

const selectClass =
  "w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-border bg-surface hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FilterValues {
  brand_id?: string;
  sort?: string;
  trashed?: string;
}

interface ProductFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
  onClear: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProductFiltersDrawer({
  isOpen,
  onClose,
  filters,
  onApply,
  onClear,
}: ProductFiltersDrawerProps) {
  const [localFilters, setLocalFilters] = React.useState<FilterValues>(filters);

  // Reset locals when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  // ── Data ──────────────────────────────────────────────────────────────
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
    staleTime: 60_000,
  });

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({});
    onClear();
    onClose();
  };

  const activeCount = Object.values(localFilters).filter(
    (v) => v !== undefined && v !== "",
  ).length;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
            {activeCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-brand-600 text-white">
                {activeCount}
              </span>
            )}
          </DrawerTitle>
          <DrawerDescription>
            Filtra y ordena los productos del inventario.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="space-y-5">
          {/* Brand */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Marca
            </label>
            <select
              value={localFilters.brand_id || ""}
              onChange={(e) =>
                setLocalFilters((f) => ({
                  ...f,
                  brand_id: e.target.value || undefined,
                }))
              }
              className={selectClass}
            >
              <option value="">Todas las marcas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Ordenar por
            </label>
            <select
              value={localFilters.sort || ""}
              onChange={(e) =>
                setLocalFilters((f) => ({
                  ...f,
                  sort: e.target.value || undefined,
                }))
              }
              className={selectClass}
            >
              <option value="">Más recientes</option>
              <option value="name_asc">Nombre A→Z</option>
              <option value="name_desc">Nombre Z→A</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="stock_asc">Stock: menor a mayor</option>
              <option value="stock_desc">Stock: mayor a menor</option>
            </select>
          </div>
        </DrawerBody>

        <DrawerBody className="space-y-5 border-t border-border">
          {/* Archived toggle */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Estado
            </label>
            <button
              type="button"
              onClick={() =>
                setLocalFilters((f) => ({
                  ...f,
                  trashed: f.trashed === "true" ? undefined : "true",
                }))
              }
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-[var(--radius-md)] border transition-all ${localFilters.trashed === "true"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-surface border-border text-muted hover:border-[var(--border-hover)]"
                }`}
            >
              <Archive className="w-4 h-4" />
              Ver productos archivados
            </button>
          </div>
        </DrawerBody>

        <DrawerFooter>
          <Button type="button" variant="ghost" onClick={handleClear}>
            <X className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
          <Button type="button" onClick={handleApply}>
            Aplicar Filtros
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
