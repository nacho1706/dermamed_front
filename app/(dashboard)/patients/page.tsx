"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPatients } from "@/services/patients";
import { PatientList } from "@/components/features/patients/patient-list";

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", search, page],
    queryFn: () =>
      getPatients({
        search: search,
        pagina: page,
        cantidad: 10,
      }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
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
        <p className="text-medical-600">
          Administra las historias clínicas y turnos de tus pacientes.
        </p>
      </div>

      <PatientList
        data={data}
        isLoading={isLoading}
        onSearch={setSearch}
        onPageChange={setPage}
      />
    </div>
  );
}
