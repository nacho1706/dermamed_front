"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  getProductKPIs,
  deleteProduct,
  getStockMovements,
  type ProductFilters,
} from "@/services/products";
import { formatLocalDateTime } from "@/lib/timezone";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sileo } from "sileo";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Pencil,
  Trash2,
  ArrowUpDown,
  History,
  Upload,
  Download,
  Filter,
  ShoppingBag,
  Stethoscope,
  MoreHorizontal,
} from "lucide-react";
import type { Product } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BulkImportModal } from "@/components/shared/bulk-import-modal";
import { ProductFormModal } from "./ProductFormModal";
import { MovementModal } from "./MovementModal";
import { StockMovementHistoryModal } from "./StockMovementHistoryModal";
import {
  ProductFiltersDrawer,
  type FilterValues,
} from "./ProductFiltersDrawer";

// ─── Status helpers ─────────────────────────────────────────────────────────

function getStockStatus(product: Product): {
  label: string;
  color: string;
  bg: string;
} {
  if (product.stock === 0)
    return {
      label: "Sin Stock",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
    };
  if (product.stock <= product.min_stock)
    return {
      label: "Stock Bajo",
      color: "text-amber-800",
      bg: "bg-amber-50 border-amber-200",
    };
  return {
    label: "Disponible",
    color: "text-emerald-800",
    bg: "bg-emerald-50 border-emerald-200",
  };
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  badge,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badge?: { text: string; color: string };
}) {
  return (
    <Card className="hover:shadow-[var(--shadow-md)] transition-all duration-200">
      <CardBody className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted font-medium">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {value}
            </p>
            {badge && (
              <span className={`text-xs font-semibold ${badge.color}`}>
                {badge.text}
              </span>
            )}
          </div>
        </div>
        <div
          className={`w-10 h-10 rounded-[var(--radius-lg)] ${iconBg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Products Page ──────────────────────────────────────────────────────────

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { activeRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Read filters from URL ─────────────────────────────────────────────
  const urlSearch = searchParams.get("search") || "";
  const urlBrandId = searchParams.get("brand_id") || "";
  const urlSort = searchParams.get("sort") || "";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);

  const urlFilter = searchParams.get("filter") || "";

  const [search, setSearch] = useState(urlSearch);
  const [page, setPage] = useState(urlPage);
  const [showLowStock, setShowLowStock] = useState(urlFilter === "low_stock");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [movementProduct, setMovementProduct] = useState<Product | undefined>();
  const [historyProduct, setHistoryProduct] = useState<Product | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 500);

  // ── Helper: update URL search params ──────────────────────────────────
  const updateUrl = React.useCallback(
    (params: Record<string, string | undefined>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, val]) => {
        if (val) {
          sp.set(key, val);
        } else {
          sp.delete(key);
        }
      });
      // Always reset to page 1 when filters change
      if (!params.page) {
        sp.delete("page");
      }
      router.replace(`?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // Sync debounced search to URL
  React.useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      sp.set("search", debouncedSearch);
    } else {
      sp.delete("search");
    }
    sp.delete("page");
    router.replace(`?${sp.toString()}`, { scroll: false });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build API filters from URL
  const queryFilters: ProductFilters = {
    name: urlSearch || undefined,
    pagina: urlPage,
    cantidad: 10,
    brand_id: urlBrandId ? Number(urlBrandId) : undefined,
    sort: urlSort || undefined,
  };

  // ── KPI filters (same as products but without pagination) ──────────────
  const kpiFilters = {
    name: queryFilters.name,
    brand_id: queryFilters.brand_id,
  };

  // ── Hooks (ALL before conditional returns) ────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["products", queryFilters],
    queryFn: () => getProducts(queryFilters),
  });

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["products-kpis", kpiFilters],
    queryFn: () => getProductKPIs(kpiFilters),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      sileo.success({
        title: "Producto eliminado",
        description: "El producto fue eliminado correctamente.",
      });
    },
    onError: () =>
      sileo.error({
        title: "Error",
        description: "No se pudo eliminar el producto.",
      }),
  });

  React.useEffect(() => {
    if (
      activeRole &&
      !["clinic_manager", "receptionist"].includes(activeRole.name)
    ) {
      router.push("/dashboard");
    }
  }, [activeRole, router]);

  React.useEffect(() => {
    if (searchParams.get("filter") === "low_stock") {
      setShowLowStock(true);
    }
  }, [searchParams]);

  if (
    activeRole &&
    !["clinic_manager", "receptionist"].includes(activeRole.name)
  )
    return null;

  const products = data?.data || [];
  const totalPages = data?.meta?.last_page ?? 1;
  const totalProducts = data?.meta?.total ?? 0;

  // Filter for low stock toggle
  const displayProducts = showLowStock
    ? products.filter((p) => p.stock <= p.min_stock)
    : products;

  // Count active URL filters
  const activeFilterCount = [urlBrandId, urlSort].filter(Boolean).length;

  const handleExportCSV = () => {
    if (products.length === 0) {
      sileo.warning({
        title: "Sin datos",
        description: "No hay productos para exportar.",
      });
      return;
    }
    const headers = [
      "ID",
      "Nombre",
      "Descripcion",
      "Precio",
      "Stock",
      "Stock Minimo",
      "Marca",
    ];
    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.description || "").replace(/"/g, '""')}"`,
      p.price,
      p.stock,
      p.min_stock,
      `"${p.brand?.name || ""}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "productos_export.csv";
    link.click();
    URL.revokeObjectURL(url);
    sileo.success({
      title: "Exportación exitosa",
      description: `Se exportaron ${products.length} productos.`,
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleMovement = (product?: Product) => {
    setMovementProduct(product);
    setIsMovementOpen(true);
  };

  const handleHistory = (product?: Product) => {
    setHistoryProduct(product);
    setIsHistoryOpen(true);
  };

  const handleDelete = (id: number) => {
    setConfirmDelete(id);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(undefined);
  };

  const handleApplyFilters = (filters: FilterValues) => {
    updateUrl({
      brand_id: filters.brand_id,
      sort: filters.sort,
    });
  };

  const handleClearFilters = () => {
    updateUrl({
      brand_id: undefined,
      sort: undefined,
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const sp = new URLSearchParams(searchParams.toString());
    if (newPage > 1) {
      sp.set("page", String(newPage));
    } else {
      sp.delete("page");
    }
    router.replace(`?${sp.toString()}`, { scroll: false });
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Inventario de Productos
          </h1>
          <p className="text-sm text-muted mt-1">
            Gestiona el stock de cremas, inyectables y otros insumos médicos.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" onClick={() => handleMovement()}>
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Registrar Movimiento
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(undefined);
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Productos"
          value={kpisLoading ? "…" : (kpis?.total_products ?? 0)}
          icon={Package}
          iconBg="bg-blue-50"
          iconColor="text-info"
        />
        <KpiCard
          label="Valor Inventario"
          value={
            kpisLoading
              ? "…"
              : `$${(kpis?.total_value ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
          }
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-success"
        />
        <KpiCard
          label="Stock Bajo"
          value={kpisLoading ? "…" : (kpis?.low_stock_count ?? 0)}
          icon={AlertTriangle}
          iconBg={
            (kpis?.low_stock_count ?? 0) > 0 ? "bg-red-50" : "bg-emerald-50"
          }
          iconColor={
            (kpis?.low_stock_count ?? 0) > 0 ? "text-danger" : "text-success"
          }
          badge={
            (kpis?.low_stock_count ?? 0) > 0
              ? { text: "Atención", color: "text-danger" }
              : undefined
          }
        />
        <KpiCard
          label="Productos Activos"
          value={kpisLoading ? "…" : (kpis?.active_products ?? 0)}
          icon={TrendingUp}
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
        />
      </div>

      {/* Search + Filters */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              placeholder="Buscar por nombre…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <button
            onClick={() => {
              setShowLowStock(!showLowStock);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-all shrink-0 ${
              showLowStock
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-surface border-border text-muted hover:border-[var(--border-hover)]"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Stock Bajo
          </button>
          <button
            onClick={() => setIsFiltersOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-all shrink-0 ${
              activeFilterCount > 0
                ? "bg-brand-50 border-brand-200 text-brand-700"
                : "bg-surface border-border text-muted hover:border-[var(--border-hover)]"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-brand-600 text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="!px-3 !py-2 shrink-0 h-[38px] w-[38px]"
              >
                <MoreHorizontal className="w-4 h-4 text-muted" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2 text-muted" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2 text-muted" />
                Importar CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleHistory()}>
                <History className="w-4 h-4 mr-2 text-muted" />
                Historial Global
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardBody>
      </Card>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted font-medium">
                {showLowStock
                  ? "No hay productos con stock bajo"
                  : "No se encontraron productos"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {showLowStock
                  ? "¡Todo tu inventario está en orden!"
                  : "Intenta con otro término de búsqueda."}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Producto
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3 hidden md:table-cell">
                    Marca
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Stock
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Precio
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Estado
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayProducts.map((product) => {
                  const status = getStockStatus(product);
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-surface-secondary/50 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-surface-secondary flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-muted" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {product.name}
                            </p>
                            {product.description && (
                              <p className="text-xs text-muted truncate max-w-[180px]">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Brand */}
                      <td className="px-6 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-foreground">
                          {product.brand?.name || "—"}
                        </p>
                      </td>
                      {/* Stock */}
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`text-sm font-semibold ${
                            product.stock <= product.min_stock
                              ? "text-danger"
                              : "text-foreground"
                          }`}
                        >
                          {product.stock} un.
                        </span>
                      </td>
                      {/* Price */}
                      <td className="px-6 py-3.5 text-right">
                        <span className="text-sm font-medium text-foreground font-mono">
                          $
                          {product.price.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Registrar Movimiento"
                            onClick={() => handleMovement(product)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-brand-600 bg-brand-50 hover:bg-brand-100 transition-all font-bold text-lg"
                          >
                            ⇅
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-muted hover:text-foreground hover:bg-surface-secondary transition-all">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleEdit(product)}
                              >
                                <Pencil className="w-4 h-4 mr-2 text-muted" />
                                Editar Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleHistory(product)}
                              >
                                <History className="w-4 h-4 mr-2 text-muted" />
                                Ver Historial
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-danger focus:bg-red-50 focus:text-danger"
                                onClick={() => handleDelete(product.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Archivar / Desactivar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <p className="text-xs text-muted">
              Mostrando página {urlPage} de {totalPages} ({totalProducts}{" "}
              resultados)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(Math.max(1, urlPage - 1))}
                disabled={urlPage === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] border border-border hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 text-xs font-medium rounded-[var(--radius-md)] transition-all ${
                      urlPage === pageNum
                        ? "bg-brand-600 text-white"
                        : "border border-border hover:bg-surface-secondary"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() =>
                  handlePageChange(Math.min(totalPages, urlPage + 1))
                }
                disabled={urlPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] border border-border hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals & Drawers */}
      {isMovementOpen && activeRole && (
        <MovementModal
          isOpen={isMovementOpen}
          onClose={() => setIsMovementOpen(false)}
          preselectedProduct={movementProduct}
          userId={activeRole.id}
        />
      )}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        product={editingProduct}
      />
      {isHistoryOpen && (
        <StockMovementHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          product={historyProduct}
        />
      )}
      <ProductFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        filters={{
          brand_id: urlBrandId,
          sort: urlSort,
        }}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />
      <BulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Importar Productos"
        endpointUrl="/products/import"
        templateUrl="/templates/products_template.csv"
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["products"] })
        }
      />
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() =>
          confirmDelete !== null && deleteMut.mutate(confirmDelete)
        }
        title="Eliminar producto"
        description="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
