"use client";

import React from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { FilterableSelect } from "@/components/shared/filterable-select";
import type { AppointmentFormValues } from "./appointment-modal";

interface ServiceSelectorProps {
  form: UseFormReturn<AppointmentFormValues>;
  services: any[];
  disabled?: boolean;
}

export function ServiceSelector({
  form,
  services,
  disabled = false,
}: ServiceSelectorProps) {
  const {
    control,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-1.5 flex-1">
      <Label
        htmlFor="service_id"
        className="text-sm font-medium text-foreground"
      >
        Servicio
      </Label>
      <Controller
        name="service_id"
        control={control}
        render={({ field }) => (
          <FilterableSelect
            value={field.value}
            onChange={(val) => field.onChange(val ? String(val) : "")}
            options={services.map((s) => ({
              label: `${s.name} (${s.duration_minutes} min)`,
              value: String(s.id),
            }))}
            placeholder="Seleccionar servicio"
            disabled={disabled}
          />
        )}
      />
      {errors.service_id && (
        <p className="text-xs text-danger font-medium">
          {errors.service_id.message}
        </p>
      )}
    </div>
  );
}
