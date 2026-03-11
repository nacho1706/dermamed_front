"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { getPatients } from "@/services/patients";
import { PatientList } from "@/components/features/patients/patient-list";
import { BulkImportModal } from "@/components/shared/bulk-import-modal";
import {
  PatientFiltersDrawer,
  type PatientFilterValues,
} from "./PatientFiltersDrawer";
import { Button } from "@/components/ui/button";
import { Upload, Download, Plus, MoreHorizontal, Filter } from "lucide-react";
import { sileo } from "sileo";
import type { Patient } from "@/types";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Suspense } from "react";

// ─── Inner component that uses searchParams ──────────────────────────────────

function PatientsPageInner() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── URL-derived state ──────────────────────────────────────────────────
  const urlSearch = searchParams.get("search") || "";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const urlInsurance = searchParams.get("insurance_provider") || "";
  const urlProvince = searchParams.get("province") || "";
  const urlSort = searchParams.get("sort") || "";

  const [search, setSearch] = useState(urlSearch);
  const [page, setPage] = useState(urlPage);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Debounced search passed to the query
  const debouncedSearch = useDebounce(search, 0); // already debounced by GlobalSearchInput

  // ── Helper: sync state to URL ──────────────────────────────────────────
  const updateUrl = useCallback(
    (params: Record<string, string | undefined>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([k, v]) => {
        if (v) sp.set(k, v);
        else sp.delete(k);
      });
      if (!("page" in params)) sp.delete("page");
      router.replace(`?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // ── Active filter count badge ──────────────────────────────────────────
  const activeFilterCount = [urlInsurance, urlProvince, urlSort].filter(
    Boolean,
  ).length;

  // ── TanStack Query ─────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: [
      "patients",
      debouncedSearch,
      page,
      urlInsurance,
      urlProvince,
      urlSort,
    ],
    queryFn: () =>
      getPatients({
        search: debouncedSearch || undefined,
        pagina: page,
        cantidad: 10,
        insurance_provider: urlInsurance || undefined,
        province: urlProvince || undefined,
        sort: urlSort || undefined,
      }),
  });

  // Collect unique insurance providers from current page to populate drawer
  const insuranceProviders = Array.from(
    new Set(
      (data?.data || [])
        .map((p) => p.insurance_provider)
        .filter((v): v is string => Boolean(v)),
    ),
  ).sort();

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleSearch = useCallback(
    (val: string) => {
      setSearch(val);
      setPage(1);
      updateUrl({ search: val || undefined });
    },
    [updateUrl],
  );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl({ page: newPage > 1 ? String(newPage) : undefined });
  };

  const handleApplyFilters = (filters: PatientFilterValues) => {
    updateUrl({
      insurance_provider: filters.insurance_provider,
      province: filters.province,
      sort: filters.sort,
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    updateUrl({
      insurance_provider: undefined,
      province: undefined,
      sort: undefined,
    });
    setPage(1);
  };

  // ── CSV Export ─────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const patients: Patient[] = data?.data || [];
    if (patients.length === 0) {
      sileo.warning({
        title: "Sin datos",
        description: "No hay pacientes para exportar.",
      });
      return;
    }
    const headers = [
      "ID",
      "Nombre",
      "Apellido",
      "DNI",
      "CUIL",
      "Email",
      "Telefono",
      "Obra Social",
      "Ciudad",
      "Provincia",
      "Fecha Nacimiento",
    ];
    const rows = patients.map((p) => [
      p.id,
      `"${(p.first_name || "").replace(/"/g, '""')}"`,
      `"${(p.last_name || "").replace(/"/g, '""')}"`,
      p.dni || "",
      p.cuit || "",
      p.email || "",
      p.phone || "",
      `"${(p.insurance_provider || "").replace(/"/g, '""')}"`,
      `"${(p.city || "").replace(/"/g, '""')}"`,
      `"${(p.province || "").replace(/"/g, '""')}"`,
      p.birth_date || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pacientes_export.csv";
    link.click();
    URL.revokeObjectURL(url);
    sileo.success({
      title: "Exportación exitosa",
      description: `Se exportaron ${patients.length} pacientes.`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              Gestión de Pacientes
            </h1>
            {data?.meta?.total !== undefined && (
              <span className="text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-500">
                {data.meta.total}{" "}
                {data.meta.total === 1 ? "resultado" : "resultados"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/patients/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Paciente
              </Button>
            </Link>
          </div>
        </div>
        <p className="text-muted">
          Administra las historias clínicas y turnos de tus pacientes.
        </p>
      </div>

      <PatientList
        data={data}
        isLoading={isLoading}
        onSearch={handleSearch}
        onPageChange={handlePageChange}
        onOpenFilters={() => setIsFiltersOpen(true)}
        activeFilterCount={activeFilterCount}
        secondaryActions={
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
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Filters Drawer */}
      <PatientFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        filters={{
          insurance_provider: urlInsurance,
          province: urlProvince,
          sort: urlSort,
        }}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        insuranceProviders={insuranceProviders}
      />

      <BulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Importar Pacientes"
        endpointUrl="/patients/import"
        templateUrl="/templates/patients_template.csv"
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["patients"] })
        }
      />
    </div>
  );
}

// ─── Suspense wrapper (required for useSearchParams) ─────────────────────────

export default function PatientsPage() {
  return (
    <Suspense>
      <PatientsPageInner />
    </Suspense>
  );
}
