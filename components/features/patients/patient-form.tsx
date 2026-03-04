"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { ARGENTINE_PROVINCES } from "@/constants/provinces";
import { INSURANCE_PROVIDERS } from "@/constants/insurance-providers";
import type { Patient } from "@/types";
import { Loader2, MapPin, User, Phone, Building } from "lucide-react";
import { getPatients } from "@/services/patients";

/**
 * Validation schema based on StorePatientRequest.php backend rules
 */
const patientSchemaBase = z.object({
  first_name: z.string().min(1, "El nombre es requerido").max(100),
  last_name: z.string().min(1, "El apellido es requerido").max(100),
  dni: z.string().regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 números"),
  cuit: z
    .string()
    .regex(/^\d{11}$/, "El CUIT debe tener exactamente 11 dígitos numéricos")
    .optional()
    .nullable()
    .or(z.literal("")),
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
    .nullable()
    .or(z.literal("")),
  birth_date: z.string().optional().nullable(),
  street: z.string().max(150).optional().nullable().or(z.literal("")),
  street_number: z.string().max(10).optional().nullable().or(z.literal("")),
  floor: z.string().max(10).optional().nullable().or(z.literal("")),
  apartment: z.string().max(10).optional().nullable().or(z.literal("")),
  city: z.string().max(100).optional().nullable().or(z.literal("")),
  province: z.string().max(100).optional().nullable().or(z.literal("")),
  zip_code: z.string().max(10).optional().nullable().or(z.literal("")),
  insurance_provider: z.string().max(100).optional().nullable(),
});

const patientSchema = patientSchemaBase.refine(
  (data) => {
    if (data.cuit && data.dni) {
      // Validate that the middle of the CUIT matches the DNI (padded to 8 digits)
      const dniPadded = data.dni.padStart(8, "0");
      const cuitMiddle = data.cuit.substring(2, 10);
      return cuitMiddle === dniPadded;
    }
    return true;
  },
  {
    message: "El CUIT no coincide con el DNI ingresado",
    path: ["cuit"],
  },
);

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
    control,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      dni: initialData?.dni || "",
      cuit: initialData?.cuit || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      birth_date: initialData?.birth_date
        ? initialData.birth_date.split("T")[0]
        : "",
      street: initialData?.street || "",
      street_number: initialData?.street_number || "",
      floor: initialData?.floor || "",
      apartment: initialData?.apartment || "",
      city: initialData?.city || "",
      province: initialData?.province || "",
      zip_code: initialData?.zip_code || "",
      insurance_provider: initialData?.insurance_provider || "",
    },
  });

  const handleCuitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 11
    const value = e.target.value.replace(/\D/g, "").slice(0, 11);
    setValue("cuit", value);
  };

  const handleDniBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const dni = e.target.value;
    if (dni && dni.length > 5) {
      try {
        const response = await getPatients({ dni });
        if (response.data && response.data.length > 0) {
          const exists = response.data.some(
            (p) => p.dni === dni && p.id !== initialData?.id,
          );
          if (exists) {
            setError("dni", {
              type: "manual",
              message: "Este DNI ya está registrado",
            });
          } else {
            clearErrors("dni");
          }
        } else {
          clearErrors("dni");
        }
      } catch (error) {
        // DNI validation error - silently fail since it's just a warning check
      }
    }
  };

  return (
    <Card className="max-w-3xl mx-auto border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-surface-secondary/50 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted">
          Completa los datos personales del paciente.
        </p>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardBody className="p-6 space-y-8">
          {/* ── Personal Info ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-brand-100 p-1.5 rounded-lg">
                <User className="h-4 w-4 text-brand-600" />
              </div>
              <h4 className="text-sm font-bold text-brand-700 uppercase tracking-wider">
                Datos Personales
              </h4>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input
                label="DNI"
                placeholder="Ej: 30452758"
                {...register("dni", {
                  onChange: (e) => {
                    e.target.value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 8);
                  },
                  onBlur: (e) => handleDniBlur(e),
                })}
                maxLength={8}
                inputMode="numeric"
                error={errors.dni?.message}
                required
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  CUIT / CUIL (Opcional)
                </label>
                <Controller
                  name="cuit"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 11);
                        field.onChange(value);
                        if (value.length === 11) {
                          const extractedDni = value.substring(2, 10);
                          const currentDni = getValues("dni");
                          if (!currentDni) {
                            setValue("dni", extractedDni, {
                              shouldValidate: true,
                            });
                          }
                        }
                      }}
                      placeholder="Ej: 20341234567"
                      inputMode="numeric"
                      maxLength={11}
                      className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] bg-surface border border-border placeholder:text-muted-foreground hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                    />
                  )}
                />
                {errors.cuit?.message && (
                  <p className="text-xs text-danger font-medium">
                    {errors.cuit.message}
                  </p>
                )}
                <p className="text-xs text-muted">11 dígitos sin guiones</p>
              </div>
              <Input
                label="Fecha de Nacimiento"
                type="date"
                max={new Date().toISOString().split("T")[0]}
                {...register("birth_date")}
                error={errors.birth_date?.message}
              />
            </div>
          </div>

          {/* ── Contact Info ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-brand-100 p-1.5 rounded-lg">
                <Phone className="h-4 w-4 text-brand-600" />
              </div>
              <h4 className="text-sm font-bold text-brand-700 uppercase tracking-wider">
                Contacto
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="ejemplo@correo.com"
                {...register("email")}
                error={errors.email?.message}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Teléfono
                </label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      {...field}
                      value={field.value || ""}
                      onChange={(value) => field.onChange(value || "")}
                      defaultCountry="AR"
                      international
                      limitMaxLength
                      countryCallingCodeEditable={false}
                      placeholder="Ej: 381 123 4567"
                      className="phone-input-custom"
                    />
                  )}
                />
                {errors.phone?.message && (
                  <p className="text-xs text-danger font-medium">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Address ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-brand-100 p-1.5 rounded-lg">
                <MapPin className="h-4 w-4 text-brand-600" />
              </div>
              <h4 className="text-sm font-bold text-brand-700 uppercase tracking-wider">
                Domicilio
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Calle"
                  placeholder="Ej: Av. Perón"
                  {...register("street")}
                  error={errors.street?.message}
                />
              </div>
              <Input
                label="Número"
                placeholder="Ej: 1200"
                {...register("street_number")}
                error={errors.street_number?.message}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <Input
                label="Piso"
                placeholder="Ej: 4"
                {...register("floor")}
                error={errors.floor?.message}
              />
              <Input
                label="Depto"
                placeholder="Ej: B"
                {...register("apartment")}
                error={errors.apartment?.message}
              />
              <Input
                label="Ciudad"
                placeholder="Ej: Yerba Buena"
                {...register("city")}
                error={errors.city?.message}
              />
              <Input
                label="CP"
                placeholder="Ej: 4107"
                {...register("zip_code")}
                error={errors.zip_code?.message}
              />
            </div>
            <div className="mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Provincia
                </label>
                <Controller
                  name="province"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full border-border hover:border-[var(--border-hover)] focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                        <SelectValue placeholder="Seleccionar provincia" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {ARGENTINE_PROVINCES.map((province) => (
                          <SelectItem key={province} value={province}>
                            {province}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.province?.message && (
                  <p className="text-xs text-danger font-medium">
                    {errors.province.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Insurance ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-brand-100 p-1.5 rounded-lg">
                <Building className="h-4 w-4 text-brand-600" />
              </div>
              <h4 className="text-sm font-bold text-brand-700 uppercase tracking-wider">
                Obra Social
              </h4>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Obra Social / Prepaga
              </label>
              <Controller
                name="insurance_provider"
                control={control}
                render={({ field }) => {
                  const isCustom =
                    field.value === "Otra" ||
                    (field.value &&
                      !INSURANCE_PROVIDERS.some(
                        (p) => p.value === field.value,
                      ));
                  return (
                    <div className="space-y-2">
                      <Select
                        value={isCustom ? "Otra" : field.value || ""}
                        onValueChange={(val) => {
                          if (val === "Otra") {
                            field.onChange("Otra");
                          } else {
                            field.onChange(val);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full border-border hover:border-[var(--border-hover)] focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                          <SelectValue placeholder="Seleccionar obra social" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {INSURANCE_PROVIDERS.map((provider) => (
                            <SelectItem
                              key={provider.value}
                              value={provider.value}
                            >
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isCustom && (
                        <Input
                          placeholder="Ingrese el nombre de la obra social"
                          value={
                            field.value === "Otra" ? "" : field.value || ""
                          }
                          onChange={(e) =>
                            field.onChange(e.target.value || "Otra")
                          }
                        />
                      )}
                    </div>
                  );
                }}
              />
              {errors.insurance_provider?.message && (
                <p className="text-xs text-danger font-medium">
                  {errors.insurance_provider.message}
                </p>
              )}
            </div>
          </div>
        </CardBody>

        <CardFooter className="bg-surface-secondary/30 border-t border-border p-4 flex justify-end gap-3">
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
