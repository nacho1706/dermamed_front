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
      router.push(`/patients/${id}`);
    },
    onError: (error: any) => {
      const responseData = error.response?.data;
      let message = "Error al actualizar el paciente";

      if (responseData?.errors) {
        const firstKey = Object.keys(responseData.errors)[0];
        message = responseData.errors[firstKey][0];
      } else if (responseData?.message) {
        message = responseData.message;
      }

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
        <p className="text-muted font-medium">Paciente no encontrado</p>
        <Link href="/patients" className="mt-4 inline-block">
          <Button variant="outline">Volver al listado</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/patients/${id}`}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Editar Paciente</h1>
          <p className="text-muted font-medium">{patient.full_name}</p>
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
