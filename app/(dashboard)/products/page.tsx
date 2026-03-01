"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  getProductKPIs,
  deleteProduct,
  createStockMovement,
  getStockMovements,
  type ProductFilters,
  type StockMovementInput,
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
} from "lucide-react";
import type { Product } from "@/types";
import { BulkImportModal } from "@/components/shared/bulk-import-modal";
import { ProductFormModal } from "./ProductFormModal";
import { ProductFiltersDrawer, type FilterValues } from "./ProductFiltersDrawer";

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

// ─── Stock Movement Modal ───────────────────────────────────────────────────

function StockMovementModal({
  isOpen,
  onClose,
  products,
}: {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"in" | "out" | "adjustment">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      setProductId("");
      setType("in");
      setQuantity("");
      setReason("");
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: createStockMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      sileo.success({ title: "Stock registrado", description: "El movimiento de stock fue registrado correctamente." });
      onClose();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message || "Error al registrar el movimiento";
      sileo.error({ title: "Error de stock", description: msg });
    },
  });

  const selectedProduct = products.find((p) => String(p.id) === productId);
  const qty = parseInt(quantity, 10) || 0;
  const exceedsStock =
    type === "out" && selectedProduct ? qty > selectedProduct.stock : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (exceedsStock) {
      sileo.error({
        title: "Stock insuficiente",
        description: `No se pueden retirar ${qty} unidades. Stock disponible: ${selectedProduct?.stock}.`,
      });
      return;
    }
    const data: StockMovementInput = {
      product_id: parseInt(productId, 10),
      user_id: user.id,
      type,
      quantity: qty,
      reason: reason || undefined,
    };
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar Movimiento de Stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Producto *
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-border bg-surface hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            >
              <option value="">Seleccionar producto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.stock})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Tipo *
              </label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "in" | "out" | "adjustment")
                }
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-border bg-surface hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              >
                <option value="in">Entrada</option>
                <option value="out">Salida</option>
                <option value="adjustment">Ajuste</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Cantidad *
              </label>
              <Input
                type="number"
                min="1"
                max={
                  type === "out" && selectedProduct
                    ? selectedProduct.stock
                    : undefined
                }
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              {type === "out" && selectedProduct && (
                <p
                  className={`text-xs mt-1 ${exceedsStock ? "text-red-600 font-medium" : "text-muted"
                    }`}
                >
                  {exceedsStock
                    ? `Excede stock disponible (${selectedProduct.stock} un.)`
                    : `Disponible: ${selectedProduct.stock} un.`}
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Razón
            </label>
            <Input
              placeholder="Motivo del movimiento (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.isPending || !productId || !quantity || exceedsStock
              }
            >
              {mutation.isPending ? <Spinner size="sm" /> : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stock Movement History Modal ──────────────────────────────────────────

function StockMovementHistoryModal({
  isOpen,
  onClose,
  products,
}: {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}) {
  const [filterProductId, setFilterProductId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["stock-movements", filterProductId],
    queryFn: () =>
      getStockMovements({
        cantidad: 50,
        ...(filterProductId ? { product_id: Number(filterProductId) } : {}),
      }),
    enabled: isOpen,
  });

  const movements = data?.data || [];

  const typeLabels: Record<string, { label: string; color: string }> = {
    in: {
      label: "Entrada",
      color: "text-green-700 bg-green-50 border-green-200",
    },
    out: { label: "Salida", color: "text-red-700 bg-red-50 border-red-200" },
    adjustment: {
      label: "Ajuste",
      color: "text-blue-700 bg-blue-50 border-blue-200",
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Historial de Movimientos de Stock</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <select
            value={filterProductId}
            onChange={(e) => setFilterProductId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-border bg-surface hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-auto max-h-[50vh]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : movements.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              No hay movimientos registrados
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 px-2 font-medium text-muted text-xs uppercase">
                    Fecha
                  </th>
                  <th className="py-2 px-2 font-medium text-muted text-xs uppercase">
                    Usuario
                  </th>
                  <th className="py-2 px-2 font-medium text-muted text-xs uppercase">
                    Producto
                  </th>
                  <th className="py-2 px-2 font-medium text-muted text-xs uppercase">
                    Tipo
                  </th>
                  <th className="py-2 px-2 font-medium text-muted text-xs uppercase text-right">
                    Cant.
                  </th>
                  <th className="py-2 px-2 font-medium text-muted text-xs uppercase">
                    Razón
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const typeInfo = typeLabels[m.type] || {
                    label: m.type,
                    color: "text-muted bg-surface-secondary",
                  };
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-border/50 hover:bg-surface-secondary/50"
                    >
                      <td className="py-2.5 px-2 text-xs text-muted whitespace-nowrap">
                        {formatLocalDateTime(m.created_at)}
                      </td>
                      <td className="py-2.5 px-2 text-xs">
                        {m.user?.name || "—"}
                      </td>
                      <td className="py-2.5 px-2 text-xs font-medium">
                        {m.product?.name || "—"}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeInfo.color}`}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-right font-mono font-medium">
                        {m.type === "out" ? "-" : m.type === "in" ? "+" : ""}
                        {m.quantity}
                      </td>
                      <td className="py-2.5 px-2 text-xs text-muted truncate max-w-[150px]">
                        {m.reason || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
  const urlCategoryId = searchParams.get("category_id") || "";
  const urlBrandId = searchParams.get("brand_id") || "";
  const urlType = searchParams.get("type") || "";
  const urlSort = searchParams.get("sort") || "";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);

  const [search, setSearch] = useState(urlSearch);
  const [page, setPage] = useState(urlPage);
  const [showLowStock, setShowLowStock] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
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
    category_id: urlCategoryId ? Number(urlCategoryId) : undefined,
    brand_id: urlBrandId ? Number(urlBrandId) : undefined,
    is_for_sale: urlType === "sale" ? true : undefined,
    is_supply: urlType === "supply" ? true : undefined,
    sort: urlSort || undefined,
  };

  // ── KPI filters (same as products but without pagination) ──────────────
  const kpiFilters = {
    name: queryFilters.name,
    category_id: queryFilters.category_id,
    brand_id: queryFilters.brand_id,
    is_for_sale: queryFilters.is_for_sale,
    is_supply: queryFilters.is_supply,
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
      sileo.success({ title: "Producto eliminado", description: "El producto fue eliminado correctamente." });
    },
    onError: () => sileo.error({ title: "Error", description: "No se pudo eliminar el producto." }),
  });

  React.useEffect(() => {
    if (
      activeRole &&
      !["clinic_manager", "receptionist"].includes(activeRole.name)
    ) {
      router.push("/dashboard");
    }
  }, [activeRole, router]);

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
  const activeFilterCount = [urlCategoryId, urlBrandId, urlType, urlSort].filter(Boolean).length;

  const handleExportCSV = () => {
    if (products.length === 0) {
      sileo.warning({ title: "Sin datos", description: "No hay productos para exportar." });
      return;
    }
    const headers = ["ID", "Nombre", "Descripcion", "Precio", "Stock", "Stock Minimo", "Marca", "Categoria", "Subcategoria", "Venta", "Insumo"];
    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.description || "").replace(/"/g, '""')}"`,
      p.price,
      p.stock,
      p.min_stock,
      `"${p.brand?.name || ""}"`,
      `"${p.category?.name || ""}"`,
      `"${p.subcategory?.name || ""}"`,
      p.is_for_sale ? "SI" : "NO",
      p.is_supply ? "SI" : "NO",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "productos_export.csv";
    link.click();
    URL.revokeObjectURL(url);
    sileo.success({ title: "Exportación exitosa", description: `Se exportaron ${products.length} productos.` });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
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
      category_id: filters.category_id,
      brand_id: filters.brand_id,
      type: filters.type,
      sort: filters.sort,
    });
  };

  const handleClearFilters = () => {
    updateUrl({
      category_id: undefined,
      brand_id: undefined,
      type: undefined,
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
          <Button variant="outline" onClick={() => setIsHistoryOpen(true)}>
            <History className="w-4 h-4 mr-2" />
            Historial
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar CSV
          </Button>
          <Button variant="outline" onClick={() => setIsStockOpen(true)}>
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Cargar Stock
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
          iconBg={(kpis?.low_stock_count ?? 0) > 0 ? "bg-red-50" : "bg-emerald-50"}
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
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-all shrink-0 ${showLowStock
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-surface border-border text-muted hover:border-[var(--border-hover)]"
              }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Stock Bajo
          </button>
          <button
            onClick={() => setIsFiltersOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-all shrink-0 ${activeFilterCount > 0
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
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3 hidden lg:table-cell">
                    Categoría
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3 hidden md:table-cell">
                    Marca
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Tipo
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
                      {/* Category */}
                      <td className="px-6 py-3.5 hidden lg:table-cell">
                        <div>
                          <p className="text-sm text-foreground">
                            {product.category?.name || "—"}
                          </p>
                          {product.subcategory && (
                            <p className="text-xs text-muted">
                              {product.subcategory.name}
                            </p>
                          )}
                        </div>
                      </td>
                      {/* Brand */}
                      <td className="px-6 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-foreground">
                          {product.brand?.name || "—"}
                        </p>
                      </td>
                      {/* Type badges */}
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {product.is_for_sale && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 border-emerald-200 text-emerald-700">
                              <ShoppingBag className="w-3 h-3" />
                              Venta
                            </span>
                          )}
                          {product.is_supply && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 border-blue-200 text-blue-700">
                              <Stethoscope className="w-3 h-3" />
                              Insumo
                            </span>
                          )}
                          {!product.is_for_sale && !product.is_supply && (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </div>
                      </td>
                      {/* Stock */}
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`text-sm font-semibold ${product.stock <= product.min_stock
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
                            onClick={() => handleEdit(product)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-muted hover:text-foreground hover:bg-surface-secondary transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-muted hover:text-danger hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                    className={`w-8 h-8 text-xs font-medium rounded-[var(--radius-md)] transition-all ${urlPage === pageNum
                      ? "bg-brand-600 text-white"
                      : "border border-border hover:bg-surface-secondary"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(Math.min(totalPages, urlPage + 1))}
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
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        product={editingProduct}
      />
      <StockMovementModal
        isOpen={isStockOpen}
        onClose={() => setIsStockOpen(false)}
        products={products}
      />
      <StockMovementHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        products={products}
      />
      <ProductFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        filters={{
          category_id: urlCategoryId,
          brand_id: urlBrandId,
          type: urlType,
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
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
      />
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete !== null && deleteMut.mutate(confirmDelete)}
        title="Eliminar producto"
        description="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
