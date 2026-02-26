"use client";

import React, { useState, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { sileo } from "sileo";
import api from "@/lib/api";
import { FileDown, Upload, FileCheck, AlertCircle, CheckCircle, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImportResult {
    message: string;
    imported_count: number;
    errors: string[];
}

export interface BulkImportModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Called when the modal should close */
    onClose: () => void;
    /** Modal title, e.g. "Importar Productos" */
    title: string;
    /** Backend endpoint URL, e.g. "/products/import" */
    endpointUrl: string;
    /** Static file URL for the CSV template, e.g. "/templates/products_template.csv" */
    templateUrl: string;
    /** Called after a successful import to trigger a data refresh */
    onSuccess: () => void;
}

// ─── BulkImportModal ─────────────────────────────────────────────────────────

export function BulkImportModal({
    isOpen,
    onClose,
    title,
    endpointUrl,
    templateUrl,
    onSuccess,
}: BulkImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state whenever the modal opens/closes
    React.useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setResult(null);
            setIsLoading(false);
            setIsDragging(false);
        }
    }, [isOpen]);

    // ── File selection ──────────────────────────────────────────────────────

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setResult(null);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped && (dropped.name.endsWith(".csv") || dropped.name.endsWith(".txt"))) {
            setFile(dropped);
            setResult(null);
        } else if (dropped) {
            sileo.error({ title: "Formato inválido", description: "Solo se admiten archivos .csv" });
        }
    }, []);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const removeFile = () => {
        setFile(null);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ── Upload ──────────────────────────────────────────────────────────────

    const handleUpload = async () => {
        if (!file) return;

        setIsLoading(true);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await api.post<ImportResult>(endpointUrl, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const data = response.data;
            setResult(data);

            if (data.imported_count > 0) {
                sileo.success({
                    title: "Importación exitosa",
                    description: `${data.imported_count} registro${data.imported_count !== 1 ? "s" : ""} importado${data.imported_count !== 1 ? "s" : ""} correctamente.`,
                });
                onSuccess();
            }
        } catch (error: any) {
            const responseData = error?.response?.data;

            // All-or-nothing backend: 422 with errors array
            if (error?.response?.status === 422 && responseData?.errors?.length > 0) {
                const errorResult: ImportResult = {
                    message: responseData.message ?? "El archivo contiene errores.",
                    imported_count: 0,
                    errors: responseData.errors,
                };
                setResult(errorResult);
                sileo.error({
                    title: "Importación rechazada",
                    description: `${errorResult.errors.length} error${errorResult.errors.length !== 1 ? "es" : ""} encontrado${errorResult.errors.length !== 1 ? "s" : ""}. No se importó ningún registro.`,
                });
            } else {
                const msg = responseData?.message ?? "Error al procesar el archivo. Verificá el formato.";
                sileo.error({ title: "Error de importación", description: msg });
                setResult({
                    message: msg,
                    imported_count: 0,
                    errors: [],
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────

    const hasErrors = result && result.errors.length > 0;
    const hasSuccess = result && result.imported_count > 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogDescription className="sr-only">Importar datos masivamente</DialogDescription>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    {/* Download template link */}
                    <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-surface-secondary border border-border">
                        <div>
                            <p className="text-sm font-medium text-foreground">Plantilla de ejemplo</p>
                            <p className="text-xs text-muted mt-0.5">
                                Descargá la plantilla para conocer el formato requerido.
                            </p>
                        </div>
                        <a
                            href={templateUrl}
                            download
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] border border-border bg-surface text-muted hover:text-foreground hover:border-[var(--border-hover)] transition-all cursor-pointer shrink-0"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            Descargar
                        </a>
                    </div>

                    {/* All-or-Nothing notice */}
                    <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] bg-amber-50 border border-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">
                            <span className="font-semibold">Importación estricta:</span> Si alguna fila contiene errores o duplicados, no se importará ningún registro del archivo.
                        </p>
                    </div>

                    {/* Drag & Drop zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => !file && fileInputRef.current?.click()}
                        className={[
                            "relative flex flex-col items-center justify-center gap-3 p-6 rounded-[var(--radius-lg)] border-2 border-dashed transition-all duration-150",
                            file
                                ? "border-brand-500 bg-brand-50/40 cursor-default"
                                : isDragging
                                    ? "border-brand-500 bg-brand-50/60 cursor-copy scale-[1.01]"
                                    : "border-border bg-surface-secondary hover:border-[var(--border-hover)] hover:bg-surface cursor-pointer",
                        ].join(" ")}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.txt"
                            className="sr-only"
                            onChange={handleFileChange}
                            aria-label="Seleccionar archivo CSV"
                        />

                        {file ? (
                            /* File selected state */
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0">
                                    <FileCheck className="w-5 h-5 text-brand-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                                    <p className="text-xs text-muted mt-0.5">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeFile(); }}
                                    className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-muted hover:text-foreground hover:bg-surface transition-all"
                                    aria-label="Quitar archivo"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            /* Empty state */
                            <>
                                <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-surface border border-border flex items-center justify-center">
                                    <Upload className="w-5 h-5 text-muted" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">
                                        {isDragging ? "Soltá el archivo aquí" : "Arrastrá tu archivo CSV aquí"}
                                    </p>
                                    <p className="text-xs text-muted mt-1">
                                        o{" "}
                                        <span className="text-brand-600 font-medium underline underline-offset-2">
                                            hacé clic para seleccionar
                                        </span>
                                    </p>
                                    <p className="text-xs text-muted mt-2">Solo archivos .csv — máx. 5 MB</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Result panel */}
                    {result && (
                        <div className="space-y-3">
                            {/* Success summary */}
                            {hasSuccess && (
                                <div className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] bg-emerald-50 border border-emerald-200">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-emerald-800">
                                            {result.imported_count} registro{result.imported_count !== 1 ? "s" : ""} importado
                                            {result.imported_count !== 1 ? "s" : ""} correctamente
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Error list */}
                            {hasErrors && (
                                <div className="rounded-[var(--radius-md)] border border-red-200 overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-red-200">
                                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                                            {result.errors.length} error{result.errors.length !== 1 ? "es" : ""} encontrado{result.errors.length !== 1 ? "s" : ""} — ningún registro fue importado
                                        </p>
                                    </div>
                                    <ul className="max-h-36 overflow-y-auto divide-y divide-red-100">
                                        {result.errors.map((err, idx) => (
                                            <li key={idx} className="px-3 py-2 text-xs text-red-700 font-mono">
                                                {err}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 pt-1">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                            {result && hasSuccess ? "Cerrar" : "Cancelar"}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleUpload}
                            disabled={!file || isLoading}
                            className="min-w-[130px]"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Spinner size="sm" />
                                    Importando…
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Upload className="w-4 h-4" />
                                    Importar
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
