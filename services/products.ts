import api from "@/lib/api";
import type {
  Product,
  Brand,
  Category,
  Subcategory,
  StockMovement,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

// ─── Product Filters ────────────────────────────────────────────────────────

export interface ProductFilters extends PaginationParams {
  name?: string;
  low_stock?: boolean;
  stock_status?: "low";
  trashed?: "true" | "false";
  brand_id?: number;
  sort?: string;
}

// ─── Products CRUD ──────────────────────────────────────────────────────────

export interface ProductKPIs {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  active_products: number;
}

export async function getProductKPIs(
  filters?: Omit<ProductFilters, "pagina" | "cantidad">,
): Promise<ProductKPIs> {
  const response = await api.get<ProductKPIs>("/products/kpis", {
    params: filters,
  });
  return response.data;
}

export async function getProducts(
  filters?: ProductFilters,
): Promise<PaginatedResponse<Product>> {
  const response = await api.get<PaginatedResponse<Product>>("/products", {
    params: filters,
  });
  return response.data;
}

export async function getProduct(id: number): Promise<Product> {
  const response = await api.get<{ data: Product }>(`/products/${id}`);
  return response.data.data;
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  const response = await api.post<{ data: Product }>("/products", data);
  return response.data.data;
}

export async function updateProduct(
  id: number,
  data: Partial<Product>,
): Promise<Product> {
  const response = await api.put<{ data: Product }>(`/products/${id}`, data);
  return response.data.data;
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`);
}

export async function restoreProduct(id: number): Promise<Product> {
  const response = await api.patch<{ data: Product }>(`/products/${id}/restore`);
  return response.data.data;
}

export async function getAdjustmentReasons(): Promise<
  { value: string; label: string }[]
> {
  const response = await api.get<{
    data: { value: string; label: string }[];
  }>("/stock-movements/adjustment-reasons");
  return response.data.data;
}

// ─── Brands ─────────────────────────────────────────────────────────────────

export async function getBrands(): Promise<Brand[]> {
  const response = await api.get<{ data: Brand[] }>("/brands");
  return response.data.data;
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const response = await api.get<{ data: Category[] }>("/categories");
  return response.data.data;
}

// ─── Subcategories ──────────────────────────────────────────────────────────

export async function getSubcategories(
  categoryId?: number,
): Promise<Subcategory[]> {
  const response = await api.get<{ data: Subcategory[] }>("/subcategories", {
    params: categoryId ? { category_id: categoryId } : {},
  });
  return response.data.data;
}

// ─── Stock Movements ────────────────────────────────────────────────────────

export interface StockMovementInput {
  product_id: number;
  user_id: number;
  type: "in" | "out" | "adjustment";
  quantity: number;
  reason?: string;
}

export interface StockMovementFilters extends PaginationParams {
  product_id?: number;
  type?: "in" | "out" | "adjustment";
  date_from?: string;
  date_to?: string;
}

export async function getStockMovements(
  filters?: StockMovementFilters,
): Promise<PaginatedResponse<StockMovement>> {
  const response = await api.get<PaginatedResponse<StockMovement>>(
    "/stock-movements",
    { params: filters },
  );
  return response.data;
}

export async function createStockMovement(
  data: StockMovementInput,
): Promise<StockMovement> {
  const response = await api.post<{ data: StockMovement }>(
    `/products/${data.product_id}/movements`,
    data,
  );
  return response.data.data;
}
