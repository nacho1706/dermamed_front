"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import type { Patient } from "@/types";
import { Loader2 } from "lucide-react";

/**
 * Validation schema based on StorePatientRequest.php backend rules
 */
const patientSchema = z.object({
  first_name: z.string().min(1, "El nombre es requerido").max(100),
  last_name: z.string().min(1, "El apellido es requerido").max(100),
  cuit: z
    .string()
    .max(20, "El CUIT/DNI es demasiado largo")
    .optional()
    .nullable(),
  email: z
    .string()
    .email("Email inválido")
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z
    .string()
    .max(50, "El teléfono es demasiado largo")
    .optional()
    .nullable(),
  birth_date: z.string().optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  insurance_provider: z.string().max(100).optional().nullable(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientFormProps {
  initialData?: Patient;
  onSubmit: (data: PatientFormValues) => void;
  isLoading?: boolean;
  title: string;
  submitLabel: string;
}

export function PatientForm({
  initialData,
  onSubmit,
  isLoading,
  title,
  submitLabel,
}: PatientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      cuit: initialData?.cuit || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      birth_date: initialData?.birth_date
        ? initialData.birth_date.split("T")[0]
        : "",
      address: initialData?.address || "",
      insurance_provider: initialData?.insurance_provider || "",
    },
  });

  return (
    <Card className="max-w-2xl mx-auto border-medical-200/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-medical-50/50 border-b border-medical-100">
        <h3 className="text-lg font-semibold text-medical-800">{title}</h3>
        <p className="text-sm text-medical-600">
          Completa los datos personales del paciente.
        </p>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardBody className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              placeholder="Ej: María"
              {...register("first_name")}
              error={errors.first_name?.message}
              required
            />
            <Input
              label="Apellido"
              placeholder="Ej: González"
              {...register("last_name")}
              error={errors.last_name?.message}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Documento (DNI/CUIT)"
              placeholder="Ej: 20-34123456-7"
              {...register("cuit")}
              error={errors.cuit?.message}
            />
            <Input
              label="Fecha de Nacimiento"
              type="date"
              {...register("birth_date")}
              error={errors.birth_date?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="ejemplo@correo.com"
              {...register("email")}
              error={errors.email?.message}
            />
            <Input
              label="Teléfono"
              placeholder="Ej: +54 9 11 1234-5678"
              {...register("phone")}
              error={errors.phone?.message}
            />
          </div>

          <div className="space-y-4">
            <Input
              label="Dirección"
              placeholder="Ej: Av. Santa Fe 1234, CABA"
              {...register("address")}
              error={errors.address?.message}
            />
            <Input
              label="Obra Social / Prepaga"
              placeholder="Ej: OSDE 310"
              {...register("insurance_provider")}
              error={errors.insurance_provider?.message}
            />
          </div>
        </CardBody>

        <CardFooter className="bg-medical-50/30 border-t border-medical-100 p-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="min-w-[120px]">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
