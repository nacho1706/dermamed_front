"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  getStockMovements,
  type StockMovementFilters,
} from "@/services/products";
import { formatLocalDateTime } from "@/lib/timezone";
import {
  Package,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  XIcon,
  CalendarDays,
} from "lucide-react";
import type { Product, StockMovement } from "@/types";
import { cn } from "@/lib/utils";

// ─── Date preset types ───────────────────────────────────────────────────────
type DatePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "this_month"
  | "custom"
  | null;

export function StockMovementHistoryModal({
  isOpen,
  onClose,
  product,
}: {
  isOpen: boolean;
  onClose: () => void;
  product?: Product; // If undefined, it's Global History
}) {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<StockMovementFilters["type"]>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>(null);

  // ─── Preset logic ────────────────────────────────────────────────────────
  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "today") {
      const today = fmt(now);
      setDateFrom(today);
      setDateTo(today);
    } else if (preset === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const y = fmt(yest);
      setDateFrom(y);
      setDateTo(y);
    } else if (preset === "last7") {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      setDateFrom(fmt(from));
      setDateTo(fmt(now));
    } else if (preset === "this_month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(fmt(from));
      setDateTo(fmt(now));
    } else if (preset === "custom") {
      // Keep whatever dates exist; user fills them in manually
      setDateFrom("");
      setDateTo("");
    } else {
      // null — clear all
      setDateFrom("");
      setDateTo("");
    }
  };

  // Use product_id filter if a product is provided
  const filters: StockMovementFilters = {
    pagina: page,
    cantidad: 10,
    product_id: product?.id,
    type: typeFilter,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["stock-movements", filters],
    queryFn: () => getStockMovements(filters),
    enabled: isOpen,
  });

  const movements = data?.data || [];
  const meta = data?.meta;
  const totalPages = meta?.last_page || 1;

  // ─── Type badge info ─────────────────────────────────────────────────────
  const getTypeInfo = (type: string, reason: string | null) => {
    switch (type) {
      case "in":
        return {
          icon: TrendingUp,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
          label: reason === "supplier_purchase" ? "Compra" : "Ingreso",
        };
      case "out":
        return {
          icon: TrendingDown,
          color: "text-red-600",
          bg: "bg-red-50",
          label:
            reason === "patient_sale"
              ? "Venta"
              : reason === "internal_use"
                ? "Uso Interno"
                : "Retiro",
        };
      default:
        return {
          icon: ArrowLeftRight,
          color: "text-blue-600",
          bg: "bg-blue-50",
          label: "Ajuste",
        };
    }
  };

  // ─── Ledger quantity renderer ─────────────────────────────────────────────
  const renderQuantity = (movement: StockMovement) => {
    const prev = movement.previous_stock ?? 0;
    const qty = movement.quantity;

    if (movement.type === "in") {
      return (
        <div className="flex flex-col items-end shrink-0">
          <span className="text-sm font-bold text-emerald-600">+{qty}</span>
          <span className="text-[10px] text-muted leading-tight">
            Quedan: {prev + qty}
          </span>
        </div>
      );
    }
    if (movement.type === "out") {
      return (
        <div className="flex flex-col items-end shrink-0">
          <span className="text-sm font-bold text-red-600">-{qty}</span>
          <span className="text-[10px] text-muted leading-tight">
            Quedan: {prev - qty}
          </span>
        </div>
      );
    }
    // adjustment
    return (
      <div className="flex flex-col items-end shrink-0">
        <span className="text-sm font-bold text-blue-600">
          {prev} → {qty}
        </span>
        <span className="text-[10px] text-muted leading-tight">Ajuste</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <Package className="w-4 h-4 text-brand-600" />
              </div>
              {product
                ? `Historial: ${product.name}`
                : "Historial Global de Stock"}
            </DialogTitle>
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant={!typeFilter ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                setTypeFilter(undefined);
                setPage(1);
              }}
              className="h-8 text-xs"
            >
              Todos
            </Button>
            <Button
              variant={typeFilter === "in" ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                setTypeFilter("in");
                setPage(1);
              }}
              className="h-8 text-xs"
            >
              Ingresos
            </Button>
            <Button
              variant={typeFilter === "out" ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                setTypeFilter("out");
                setPage(1);
              }}
              className="h-8 text-xs"
            >
              Retiros
            </Button>
            <Button
              variant={typeFilter === "adjustment" ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                setTypeFilter("adjustment");
                setPage(1);
              }}
              className="h-8 text-xs"
            >
              Ajustes
            </Button>
          </div>

          {/* Date preset bar */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { key: "today", label: "Hoy" },
                  { key: "yesterday", label: "Ayer" },
                  { key: "last7", label: "Últimos 7 días" },
                  { key: "this_month", label: "Este mes" },
                  { key: "custom", label: "Personalizado" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(datePreset === key ? null : key)}
                  className={cn(
                    "h-7 px-3 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer",
                    datePreset === key
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-surface border-border text-muted hover:border-brand-500 hover:text-brand-600",
                  )}
                >
                  {label}
                </button>
              ))}

              {datePreset && (
                <button
                  type="button"
                  onClick={() => applyPreset(null)}
                  className="h-7 px-2 rounded-full text-xs text-muted hover:text-foreground border border-border transition-colors cursor-pointer flex items-center gap-1"
                >
                  <XIcon className="w-3 h-3" />
                  Limpiar
                </button>
              )}
            </div>

            {/* Custom date inputs — only visible when preset = 'custom' */}
            {datePreset === "custom" && (
              <div className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-150">
                <CalendarDays className="w-4 h-4 text-muted shrink-0" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs"
                />
                <span className="text-xs text-muted">a</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-secondary/30">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ArrowLeftRight className="w-10 h-10 text-muted-foreground mb-3 opacity-20" />
              <p className="text-sm font-medium text-muted">
                No hay movimientos registrados
              </p>
              {typeFilter && (
                <p className="text-xs text-muted-foreground mt-1">
                  Con el filtro actual
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {movements.map((movement) => {
                const info = getTypeInfo(movement.type, movement.reason);
                const Icon = info.icon;
                return (
                  <div
                    key={movement.id}
                    className="flex items-start gap-4 p-4 rounded-xl border border-border bg-surface hover:border-[var(--border-hover)] transition-all"
                  >
                    {/* Type icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${info.bg}`}
                    >
                      <Icon className={`w-4 h-4 ${info.color}`} />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {!product && (
                            <span className="text-brand-600 mr-1">
                              {movement.product?.name} •
                            </span>
                          )}
                          {info.label}
                        </p>
                        {/* Ledger quantity */}
                        {renderQuantity(movement)}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted">
                        {/* Timestamp */}
                        <span className="flex items-center">
                          {formatLocalDateTime(movement.created_at)}
                        </span>
                        {/* Responsible user */}
                        {movement.user && (
                          <span className="flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                            {movement.user.name ??
                              `${movement.user.first_name ?? ""} ${movement.user.last_name ?? ""}`.trim()}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {movement.notes && (
                        <div className="mt-2 p-2.5 rounded-md bg-surface-secondary/50 border border-border/50 text-xs text-muted-foreground italic line-clamp-2">
                          &ldquo;{movement.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="p-4 border-t border-border bg-surface shrink-0 flex items-center justify-between">
          <p className="text-xs text-muted font-medium">
            Página {page} de {totalPages}{" "}
            {meta?.total ? `(${meta.total} regs)` : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="h-8 px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
