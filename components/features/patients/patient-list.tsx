"use client";

import { useState } from "react";
import {
  Search,
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlobalSearchInput } from "@/components/shared/global-search-input";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";
import type { Patient, PaginatedResponse } from "@/types";
import Link from "next/link";

interface PatientListProps {
  data: PaginatedResponse<Patient> | undefined;
  isLoading: boolean;
  onSearch: (query: string) => void;
  onPageChange: (page: number) => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  secondaryActions?: React.ReactNode;
}

export function PatientList({
  data,
  isLoading,
  onSearch,
  onPageChange,
  onOpenFilters,
  activeFilterCount = 0,
  secondaryActions,
}: PatientListProps) {
  const patients = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-96">
          <GlobalSearchInput
            placeholder="Buscar por Nombre, DNI o Teléfono..."
            onSearch={(val) => {
              onSearch(val);
              onPageChange(1); // Reset page on new search
            }}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={onOpenFilters}
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-all shrink-0 ${
              activeFilterCount > 0
                ? "bg-brand-50 border-brand-200 text-brand-700"
                : "bg-surface border-border text-muted hover:border-[var(--border-hover)]"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-brand-600 text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {secondaryActions}
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider w-[35%]">
                  Paciente
                </th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider w-[17%]">
                  DNI
                </th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider w-[22%]">
                  Contacto
                </th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider w-[14%]">
                  Obra Social
                </th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right w-[12%]">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Spinner size="lg" className="mx-auto" />
                    <p className="mt-2 text-sm text-slate-500">
                      Cargando pacientes...
                    </p>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="h-6 w-6 text-brand-300" />
                    </div>
                    <p className="text-slate-700 font-medium">
                      No se encontraron pacientes
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Intenta con otros términos de búsqueda.
                    </p>
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-4 max-w-0 w-full truncate">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold border border-brand-200">
                          {patient.first_name[0]}
                          {patient.last_name[0]}
                        </div>
                        <div className="ml-4 min-w-0">
                          <Link
                            href={`/patients/${patient.id}`}
                            className="text-sm font-semibold text-slate-900 hover:text-brand-600 transition-colors block truncate max-w-[150px] sm:max-w-[200px] md:max-w-[300px] lg:max-w-[400px]"
                            title={patient.full_name}
                          >
                            {patient.full_name}
                          </Link>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Registrado el {formatDate(patient.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 font-medium">
                        {patient.dni || "—"}
                      </div>
                      {patient.cuit && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          CUIL: {patient.cuit}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-0 w-full truncate">
                      <div className="text-sm text-slate-700">
                        {patient.phone || "—"}
                      </div>
                      <div
                        className="text-xs text-slate-500 truncate"
                        title={patient.email || ""}
                      >
                        {patient.email || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800 border border-brand-200">
                        {patient.insurance_provider || "Particular"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/patients/${patient.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="Editar Datos"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.last_page > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Mostrando <span className="font-semibold">{meta.from}</span> a{" "}
              <span className="font-semibold">{meta.to}</span> de{" "}
              <span className="font-semibold">{meta.total}</span> pacientes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-border"
                onClick={() => onPageChange(meta.current_page - 1)}
                disabled={meta.current_page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={
                        meta.current_page === page ? "primary" : "outline"
                      }
                      size="sm"
                      className={`h-8 w-8 p-0 ${meta.current_page !== page ? "border-border" : ""}`}
                      onClick={() => onPageChange(page)}
                    >
                      {page}
                    </Button>
                  ),
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-border"
                onClick={() => onPageChange(meta.current_page + 1)}
                disabled={meta.current_page === meta.last_page}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
