"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getPatient, updatePatient } from "@/services/patients";
import { PatientForm } from "@/components/features/patients/patient-form";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const { data: patient, isLoading: isQueryLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient(id),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => updatePatient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      toast.success("Paciente actualizado correctamente");
      router.push(`/pacientes/${id}`);
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Error al actualizar el paciente";
      toast.error(message);
    },
  });

  if (isQueryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 text-center">
        <p className="text-medical-600 font-medium">Paciente no encontrado</p>
        <Link href="/pacientes" className="mt-4 inline-block">
          <Button variant="outline">Volver al listado</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/pacientes/${id}`}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-medical-900">
            Editar Paciente
          </h1>
          <p className="text-medical-600 font-medium">{patient.full_name}</p>
        </div>
      </div>

      <PatientForm
        title="Actualizar Datos"
        submitLabel="Guardar Cambios"
        initialData={patient}
        onSubmit={(data) => mutation.mutate(data)}
        isLoading={mutation.isPending}
      />
    </div>
  );
}
