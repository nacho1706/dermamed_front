"use client";

import React from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { FilterableSelect } from "@/components/shared/filterable-select";
import type { AppointmentFormValues } from "./appointment-modal";

interface DoctorSelectorProps {
  form: UseFormReturn<AppointmentFormValues>;
  doctors: any[];
  disabled?: boolean;
}

export function DoctorSelector({
  form,
  doctors,
  disabled = false,
}: DoctorSelectorProps) {
  const {
    control,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-1.5 flex-1">
      <Label
        htmlFor="doctor_id"
        className="text-sm font-medium text-foreground"
      >
        Médico
      </Label>
      <Controller
        name="doctor_id"
        control={control}
        render={({ field }) => (
          <FilterableSelect
            value={field.value}
            onChange={(val) => field.onChange(val ? String(val) : "")}
            options={doctors.map((d) => ({
              label: `Dr. ${d.name}`,
              value: String(d.id),
            }))}
            placeholder="Seleccionar médico"
            disabled={disabled}
          />
        )}
      />
      {errors.doctor_id && (
        <p className="text-xs text-danger font-medium">
          {errors.doctor_id.message}
        </p>
      )}
    </div>
  );
}
