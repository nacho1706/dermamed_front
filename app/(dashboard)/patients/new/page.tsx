"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createPatient } from "@/services/patients";
import { PatientForm } from "@/components/features/patients/patient-form";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewPatientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente creado correctamente");
      router.push(`/patients/${newPatient.id}`);
    },
    onError: (error: any) => {
      const responseData = error.response?.data;
      let message = "Error al crear el paciente";

      if (responseData?.errors) {
        const firstKey = Object.keys(responseData.errors)[0];
        message = responseData.errors[firstKey][0];
      } else if (responseData?.message) {
        message = responseData.message;
      }

      toast.error(message);
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/patients">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Nuevo Paciente</h1>
          <p className="text-muted">
            Completa el formulario para registrar un nuevo paciente.
          </p>
        </div>
      </div>

      <PatientForm
        title="Datos del Paciente"
        submitLabel="Crear Paciente"
        onSubmit={(data) => mutation.mutate(data)}
        isLoading={mutation.isPending}
      />
    </div>
  );
}
