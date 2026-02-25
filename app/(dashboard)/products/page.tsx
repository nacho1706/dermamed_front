"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  deleteProduct,
  createProduct,
  updateProduct,
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
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import type { Product } from "@/types";
import { BulkImportModal } from "@/components/shared/bulk-import-modal";

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

// ─── Product Form Modal ─────────────────────────────────────────────────────

function ProductFormModal({
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
  const [stock, setStock] = useState(product?.stock?.toString() || "");
  const [minStock, setMinStock] = useState(
    product?.min_stock?.toString() || "",
  );

  // Reset form when product changes
  React.useEffect(() => {
    if (isOpen) {
      setName(product?.name || "");
      setDescription(product?.description || "");
      setPrice(product?.price?.toString() || "");
      setStock(product?.stock?.toString() || "");
      setMinStock(product?.min_stock?.toString() || "");
    }
  }, [isOpen, product]);

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Producto creado correctamente");
      onClose();
    },
    onError: () => toast.error("Error al crear el producto"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Producto actualizado correctamente");
      onClose();
    },
    onError: () => toast.error("Error al actualizar el producto"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      description: description || undefined,
      price: parseFloat(price),
      stock: parseInt(stock, 10),
      min_stock: parseInt(minStock, 10),
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
          <div className="grid grid-cols-3 gap-3">
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
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Stock *
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Stock Mín. *
              </label>
              <Input
                type="number"
                min="0"
                placeholder="5"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                required
              />
            </div>
          </div>
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
      toast.success("Movimiento de stock registrado");
      onClose();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message || "Error al registrar el movimiento";
      toast.error(msg);
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
      toast.error(
        `No se pueden retirar ${qty} unidades. Stock disponible: ${selectedProduct?.stock}.`,
      );
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

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showLowStock, setShowLowStock] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const debouncedSearch = useDebounce(search, 500);

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

  const { data, isLoading } = useQuery({
    queryKey: ["products", debouncedSearch, page],
    queryFn: () =>
      getProducts({
        name: debouncedSearch || undefined,
        pagina: page,
        cantidad: 10,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Producto eliminado correctamente");
    },
    onError: () => toast.error("Error al eliminar el producto"),
  });

  const products = data?.data || [];
  const totalPages = data?.meta?.last_page ?? 1;
  const totalProducts = data?.meta?.total ?? 0;

  // Compute KPIs from current data
  const allProducts = products;
  const lowStockProducts = allProducts.filter((p) => p.stock <= p.min_stock);
  const inventoryValue = allProducts.reduce(
    (sum, p) => sum + p.price * p.stock,
    0,
  );

  // Filter for low stock toggle
  const displayProducts = showLowStock
    ? products.filter((p) => p.stock <= p.min_stock)
    : products;

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      deleteMut.mutate(id);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(undefined);
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
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsHistoryOpen(true)}>
            <History className="w-4 h-4 mr-2" />
            Historial
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
          value={isLoading ? "…" : totalProducts}
          icon={Package}
          iconBg="bg-blue-50"
          iconColor="text-info"
        />
        <KpiCard
          label="Valor Inventario"
          value={
            isLoading
              ? "…"
              : `$${inventoryValue.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
          }
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-success"
        />
        <KpiCard
          label="Stock Bajo"
          value={isLoading ? "…" : lowStockProducts.length}
          icon={AlertTriangle}
          iconBg={lowStockProducts.length > 0 ? "bg-red-50" : "bg-emerald-50"}
          iconColor={
            lowStockProducts.length > 0 ? "text-danger" : "text-success"
          }
          badge={
            lowStockProducts.length > 0
              ? { text: "Atención", color: "text-danger" }
              : undefined
          }
        />
        <KpiCard
          label="Productos Activos"
          value={isLoading ? "…" : products.filter((p) => p.stock > 0).length}
          icon={TrendingUp}
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              placeholder="Buscar por nombre, código…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-all shrink-0 ${showLowStock
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-surface border-border text-muted hover:border-[var(--border-hover)]"
              }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Stock Bajo
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
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3 hidden md:table-cell">
                    Descripción
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
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-surface-secondary flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-muted" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {product.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-muted truncate max-w-[200px]">
                          {product.description || "—"}
                        </p>
                      </td>
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
                      <td className="px-6 py-3.5 text-right">
                        <span className="text-sm font-medium text-foreground font-mono">
                          $
                          {product.price.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
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
              Mostrando página {page} de {totalPages} ({totalProducts}{" "}
              resultados)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] border border-border hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 text-xs font-medium rounded-[var(--radius-md)] transition-all ${page === pageNum
                      ? "bg-brand-600 text-white"
                      : "border border-border hover:bg-surface-secondary"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] border border-border hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
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
      <BulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Importar Productos"
        endpointUrl="/products/import"
        templateUrl="/templates/products_template.csv"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
      />
    </div>
  );
}
