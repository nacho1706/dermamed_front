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
}

export function PatientList({
  data,
  isLoading,
  onSearch,
  onPageChange,
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
          <Button variant="outline" className="flex-1 md:flex-none">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Link href="/patients/new" className="flex-1 md:flex-none">
            <Button className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Paciente
            </Button>
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden border-border/40 shadow-sm ring-1 ring-border/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="border-b border-border/60">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-medical-600/80 uppercase tracking-[0.05em] w-[35%]">
                  Paciente
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-medical-600/80 uppercase tracking-[0.05em] w-[17%]">
                  DNI
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-medical-600/80 uppercase tracking-[0.05em] w-[22%]">
                  Contacto
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-medical-600/80 uppercase tracking-[0.05em] w-[14%]">
                  Obra Social
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-medical-600/80 uppercase tracking-[0.05em] text-right w-[12%]">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Spinner size="lg" className="mx-auto" />
                    <p className="mt-2 text-sm text-medical-500">
                      Cargando pacientes...
                    </p>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="bg-medical-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="h-6 w-6 text-medical-300" />
                    </div>
                    <p className="text-medical-600 font-medium">
                      No se encontraron pacientes
                    </p>
                    <p className="text-sm text-medical-400 mt-1">
                      Intenta con otros términos de búsqueda.
                    </p>
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-medical-50/30 transition-colors group"
                  >
                    <td className="px-6 py-4 max-w-0 w-full truncate">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-medical-100 flex items-center justify-center text-medical-700 font-bold border border-medical-200">
                          {patient.first_name[0]}
                          {patient.last_name[0]}
                        </div>
                        <div className="ml-4 min-w-0">
                          <Link
                            href={`/patients/${patient.id}`}
                            className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors block truncate max-w-[150px] sm:max-w-[200px] md:max-w-[300px] lg:max-w-[400px]"
                            title={patient.full_name}
                          >
                            {patient.full_name}
                          </Link>
                          <div className="text-[11px] text-medical-500/70 mt-0.5">
                            Registrado el {formatDate(patient.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-medical-600 font-medium">
                        {patient.dni || "—"}
                      </div>
                      {patient.cuit && (
                        <div className="text-[11px] text-medical-400 mt-0.5">
                          CUIL: {patient.cuit}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-0 w-full truncate">
                      <div className="text-sm text-medical-600">
                        {patient.phone || "—"}
                      </div>
                      <div
                        className="text-xs text-medical-400 truncate"
                        title={patient.email || ""}
                      >
                        {patient.email || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-medical-100 text-medical-800 border border-medical-200">
                        {patient.insurance_provider || "Particular"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/patients/${patient.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-medical-500 hover:text-medical-700 hover:bg-medical-100"
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
          <div className="px-6 py-4 bg-medical-50/50 border-t border-medical-100 flex items-center justify-between">
            <div className="text-sm text-medical-600">
              Mostrando <span className="font-semibold">{meta.from}</span> a{" "}
              <span className="font-semibold">{meta.to}</span> de{" "}
              <span className="font-semibold">{meta.total}</span> pacientes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-medical-200"
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
                      className={`h-8 w-8 p-0 ${meta.current_page !== page ? "border-medical-200" : ""}`}
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
                className="h-8 w-8 p-0 border-medical-200"
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
