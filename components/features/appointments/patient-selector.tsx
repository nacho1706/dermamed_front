"use client";

import React from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreatableAsyncCombobox } from "@/components/shared/creatable-async-combobox";
import { getPatients } from "@/services/patients";
import { UserPlus, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppointmentFormValues } from "./appointment-modal";

interface PatientSelectorProps {
  form: UseFormReturn<AppointmentFormValues>;
  isCreatingPatient: boolean;
  handleCreateRequest: (searchText: string) => void;
  handleSwitchToSearch: () => void;
  initialData?: any;
  isReadOnly?: boolean;
}

export function PatientSelector({
  form,
  isCreatingPatient,
  handleCreateRequest,
  handleSwitchToSearch,
  initialData,
  isReadOnly,
}: PatientSelectorProps) {
  const {
    control,
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor="patient_id"
        className="text-sm font-medium text-foreground"
      >
        Paciente
      </Label>

      {!isCreatingPatient && (
        <Controller
          name="patient_id"
          control={control}
          render={({ field }) => (
            <CreatableAsyncCombobox
              value={field.value}
              onChange={(val) => field.onChange(val ? String(val) : "")}
              onCreateRequest={handleCreateRequest}
              fetchFn={async (search) => {
                const res = await getPatients({ search, cantidad: 10 });
                return res.data;
              }}
              placeholder="Seleccionar paciente"
              searchPlaceholder="Buscar por nombre, apellido o teléfono..."
              disabled={!!initialData || isReadOnly}
              selectedLabel={
                initialData?.patient
                  ? `${initialData.patient.full_name}${initialData.patient.dni ? ` | DNI: ${initialData.patient.dni}` : ""}`
                  : undefined
              }
              queryKey="appointment-modal-patient"
            />
          )}
        />
      )}

      {(errors as any).patient_id && !isCreatingPatient && (
        <p className="text-xs text-danger font-medium">
          {(errors as any).patient_id.message}
        </p>
      )}

      {/* ─── Inline "Express" Patient Creation Form ───────────────── */}
      {isCreatingPatient && (
        <div
          className={cn(
            "rounded-[var(--radius-md)] border border-brand-200 bg-brand-50/40 p-4 space-y-3",
            "animate-in slide-in-from-top-2 duration-200",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-brand-600" />
              <span className="text-sm font-semibold text-brand-700">
                Registro Exprés
              </span>
            </div>
            <button
              type="button"
              onClick={handleSwitchToSearch}
              className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              Buscar existente
            </button>
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-foreground">Nombre *</Label>
              <Input
                {...register("new_patient_first_name")}
                placeholder="Ej: Juan"
                className="h-9 text-sm"
              />
              {errors.new_patient_first_name && (
                <p className="text-[11px] text-danger">
                  {errors.new_patient_first_name.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-foreground">Apellido *</Label>
              <Input
                {...register("new_patient_last_name")}
                placeholder="Ej: Pérez"
                className="h-9 text-sm"
              />
              {errors.new_patient_last_name && (
                <p className="text-[11px] text-danger">
                  {errors.new_patient_last_name.message}
                </p>
              )}
            </div>
          </div>

          {/* DNI + Phone row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-foreground">DNI *</Label>
              <Input
                {...register("new_patient_dni", {
                  onChange: (e) => {
                    e.target.value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 8);
                  },
                })}
                placeholder="Ej: 30452758"
                maxLength={8}
                inputMode="numeric"
                className="h-9 text-sm"
              />
              {errors.new_patient_dni && (
                <p className="text-[11px] text-danger">
                  {errors.new_patient_dni.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-foreground">
                Teléfono{" "}
                <span className="text-muted font-normal">(opcional)</span>
              </Label>
              <Input
                {...register("new_patient_phone")}
                placeholder="Ej: 3813193828"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
