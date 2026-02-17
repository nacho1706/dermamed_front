"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPatients, deletePatient } from "@/services/patients";
import { PatientList } from "@/components/features/patients/patient-list";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce"; // I'll need to create this hook

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", debouncedSearch, page],
    queryFn: () =>
      getPatients({
        first_name: debouncedSearch,
        pagina: page,
        cantidad: 10,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente eliminado correctamente");
    },
    onError: () => {
      toast.error("Error al eliminar el paciente");
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este paciente?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-medical-900">
          Gestión de Pacientes
        </h1>
        <p className="text-medical-600">
          Administra las historias clínicas y turnos de tus pacientes.
        </p>
      </div>

      <PatientList
        data={data}
        isLoading={isLoading}
        onSearch={setSearch}
        onPageChange={setPage}
        onDelete={handleDelete}
      />
    </div>
  );
}
