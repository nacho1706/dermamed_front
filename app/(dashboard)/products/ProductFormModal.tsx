"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    createProduct,
    updateProduct,
    getBrands,
    getCategories,
} from "@/services/products";
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
    const [stock, setStock] = useState(product?.stock?.toString() || "");
    const [minStock, setMinStock] = useState(
        product?.min_stock?.toString() || "",
    );
    const [brandId, setBrandId] = useState(
        product?.brand_id?.toString() || "",
    );
    const [categoryId, setCategoryId] = useState(
        product?.category_id?.toString() || "",
    );
    const [subcategoryId, setSubcategoryId] = useState(
        product?.subcategory_id?.toString() || "",
    );
    const [isForSale, setIsForSale] = useState(product?.is_for_sale ?? false);
    const [isSupply, setIsSupply] = useState(product?.is_supply ?? false);

    // ── Fetch brands and categories ─────────────────────────────────────
    const { data: brands = [] } = useQuery({
        queryKey: ["brands"],
        queryFn: getBrands,
        staleTime: 60_000,
    });

    const { data: categories = [] } = useQuery({
        queryKey: ["categories"],
        queryFn: getCategories,
        staleTime: 60_000,
    });

    // Dependent subcategories: filter from the selected category
    const selectedCategory = categories.find(
        (c) => String(c.id) === categoryId,
    );
    const subcategories = selectedCategory?.subcategories || [];

    // Reset form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setName(product?.name || "");
            setDescription(product?.description || "");
            setPrice(product?.price?.toString() || "");
            setStock(product?.stock?.toString() || "");
            setMinStock(product?.min_stock?.toString() || "");
            setBrandId(product?.brand_id?.toString() || "");
            setCategoryId(product?.category_id?.toString() || "");
            setSubcategoryId(product?.subcategory_id?.toString() || "");
            setIsForSale(product?.is_for_sale ?? false);
            setIsSupply(product?.is_supply ?? false);
        }
    }, [isOpen, product]);

    // When category changes, reset subcategory if it doesn't match
    React.useEffect(() => {
        if (categoryId) {
            const cat = categories.find((c) => String(c.id) === categoryId);
            const validSubs = cat?.subcategories || [];
            const stillValid = validSubs.some(
                (s) => String(s.id) === subcategoryId,
            );
            if (!stillValid) {
                setSubcategoryId("");
            }
        } else {
            setSubcategoryId("");
        }
    }, [categoryId, categories]); // eslint-disable-line react-hooks/exhaustive-deps

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
            stock: parseInt(stock, 10),
            min_stock: parseInt(minStock, 10),
            brand_id: brandId ? parseInt(brandId, 10) : null,
            category_id: categoryId ? parseInt(categoryId, 10) : null,
            subcategory_id: subcategoryId ? parseInt(subcategoryId, 10) : null,
            is_for_sale: isForSale,
            is_supply: isSupply,
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

                    {/* Brand + Category */}
                    <div className="grid grid-cols-2 gap-3">
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
                        <div>
                            <label className="text-sm font-medium text-foreground block mb-1.5">
                                Categoría
                            </label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className={selectClass}
                            >
                                <option value="">Sin categoría</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Subcategory (dependent) */}
                    {categoryId && (
                        <div>
                            <label className="text-sm font-medium text-foreground block mb-1.5">
                                Subcategoría
                            </label>
                            <select
                                value={subcategoryId}
                                onChange={(e) => setSubcategoryId(e.target.value)}
                                className={selectClass}
                                disabled={subcategories.length === 0}
                            >
                                <option value="">
                                    {subcategories.length === 0
                                        ? "Sin subcategorías disponibles"
                                        : "Seleccionar subcategoría..."}
                                </option>
                                {subcategories.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Price / Stock / Min Stock */}
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

                    {/* Type flags */}
                    <div className="flex items-center gap-6 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isForSale}
                                onChange={(e) => setIsForSale(e.target.checked)}
                                className="w-4 h-4 rounded border-border text-brand-600 focus:ring-brand-500/20 cursor-pointer"
                            />
                            <span className="text-sm font-medium text-foreground">
                                Para Venta
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isSupply}
                                onChange={(e) => setIsSupply(e.target.checked)}
                                className="w-4 h-4 rounded border-border text-brand-600 focus:ring-brand-500/20 cursor-pointer"
                            />
                            <span className="text-sm font-medium text-foreground">
                                Insumo
                            </span>
                        </label>
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
