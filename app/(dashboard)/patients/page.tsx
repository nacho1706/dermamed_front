"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPatients } from "@/services/patients";
import { PatientList } from "@/components/features/patients/patient-list";
import { BulkImportModal } from "@/components/shared/bulk-import-modal";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { sileo } from "sileo";
import type { Patient } from "@/types";

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // ── Debounced search — prevents saturating the backend on every keystroke ──
  const debouncedSearch = useDebounce(search, 500);

  // ── All hooks above any conditional returns ────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["patients", debouncedSearch, page],
    queryFn: () =>
      getPatients({
        search: debouncedSearch,
        pagina: page,
        cantidad: 10,
      }),
  });

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const patients: Patient[] = data?.data || [];
    if (patients.length === 0) {
      sileo.warning({ title: "Sin datos", description: "No hay pacientes para exportar." });
      return;
    }
    const headers = ["ID", "Nombre", "Apellido", "DNI", "CUIL", "Email", "Telefono", "Obra Social", "Ciudad", "Provincia", "Fecha Nacimiento"];
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
    sileo.success({ title: "Exportación exitosa", description: `Se exportaron ${patients.length} pacientes.` });
  };

  // ── Search & page reset handler ────────────────────────────────────────────
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-medical-900">
              Gestión de Pacientes
            </h1>
            {data?.meta?.total !== undefined && (
              <span className="bg-medical-100 text-medical-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-medical-200">
                {data.meta.total}{" "}
                {data.meta.total === 1 ? "resultado" : "resultados"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar CSV
            </Button>
          </div>
        </div>
        <p className="text-medical-600">
          Administra las historias clínicas y turnos de tus pacientes.
        </p>
      </div>

      <PatientList
        data={data}
        isLoading={isLoading}
        onSearch={handleSearch}
        onPageChange={setPage}
      />
      <BulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Importar Pacientes"
        endpointUrl="/patients/import"
        templateUrl="/templates/patients_template.csv"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["patients"] })}
      />
    </div>
  );
}
