"use client";

import React from "react";
import { Filter, X } from "lucide-react";
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

// ─── Shared select style (matches ProductFiltersDrawer) ─────────────────────

const selectClass =
  "w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-border bg-surface hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all";

// ─── Argentine provinces (static — no API needed) ────────────────────────────

export const AR_PROVINCES = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PatientFilterValues {
  insurance_provider?: string;
  province?: string;
  sort?: string;
}

interface PatientFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: PatientFilterValues;
  onApply: (filters: PatientFilterValues) => void;
  onClear: () => void;
  /** Distinct insurance providers taken from current data or pre-fetched list */
  insuranceProviders?: string[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PatientFiltersDrawer({
  isOpen,
  onClose,
  filters,
  onApply,
  onClear,
  insuranceProviders = [],
}: PatientFiltersDrawerProps) {
  const [localFilters, setLocalFilters] =
    React.useState<PatientFilterValues>(filters);

  // Reset locals when drawer opens
  React.useEffect(() => {
    if (isOpen) setLocalFilters(filters);
  }, [isOpen, filters]);

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
            Filtra y ordena el listado de pacientes.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="space-y-5">
          {/* Obra Social */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Obra Social
            </label>
            <select
              value={localFilters.insurance_provider || ""}
              onChange={(e) =>
                setLocalFilters((f) => ({
                  ...f,
                  insurance_provider: e.target.value || undefined,
                }))
              }
              className={selectClass}
            >
              <option value="">Todas las obras sociales</option>
              {insuranceProviders.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Provincia */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Provincia
            </label>
            <select
              value={localFilters.province || ""}
              onChange={(e) =>
                setLocalFilters((f) => ({
                  ...f,
                  province: e.target.value || undefined,
                }))
              }
              className={selectClass}
            >
              <option value="">Todas las provincias</option>
              {AR_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
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
              <option value="created_asc">Más antiguos</option>
            </select>
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
