"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  getDoctorAvailabilities,
  syncDoctorAvailabilities,
  type AvailabilitySlot,
} from "@/services/doctor-availability";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = [
  { label: "Lunes", value: 1 },
  { label: "Martes", value: 2 },
  { label: "Miércoles", value: 3 },
  { label: "Jueves", value: 4 },
  { label: "Viernes", value: 5 },
  { label: "Sábado", value: 6 },
  { label: "Domingo", value: 0 },
];

// ─── Schema ──────────────────────────────────────────────────────────────────

const daySchema = z.object({
  enabled: z.boolean(),
  start_time: z.string(),
  end_time: z.string(),
});

const availabilityFormSchema = z.object({
  days: z.array(daySchema),
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

interface DoctorAvailabilityFormProps {
  /** The doctor's user ID. Defaults to the current user if not provided. */
  doctorId: number;
  doctorName?: string;
}

export function DoctorAvailabilityForm({
  doctorId,
  doctorName,
}: DoctorAvailabilityFormProps) {
  const queryClient = useQueryClient();

  const { data: availData, isLoading } = useQuery({
    queryKey: ["doctor-availabilities", doctorId],
    queryFn: () => getDoctorAvailabilities({ doctor_id: doctorId, cantidad: 100 }),
    enabled: !!doctorId,
  });

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      days: DAYS.map(() => ({ enabled: false, start_time: "08:00", end_time: "18:00" })),
    },
  });

  // Hydrate form when data loads
  useEffect(() => {
    if (!availData) return;
    const existingSlots = availData.data ?? [];

    const days = DAYS.map((day) => {
      const slot = existingSlots.find((s) => s.day_of_week === day.value);
      return {
        enabled: !!slot,
        start_time: slot?.start_time?.substring(0, 5) ?? "08:00",
        end_time: slot?.end_time?.substring(0, 5) ?? "18:00",
      };
    });

    form.reset({ days });
  }, [availData, form]);

  const syncMutation = useMutation({
    mutationFn: (slots: AvailabilitySlot[]) =>
      syncDoctorAvailabilities({ doctor_id: doctorId, availabilities: slots }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-availabilities", doctorId] });
      toast.success("Disponibilidad actualizada correctamente");
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? "Error al actualizar la disponibilidad";
      toast.error(msg);
    },
  });

  const onSubmit = (data: AvailabilityFormValues) => {
    const slots: AvailabilitySlot[] = [];

    data.days.forEach((day, index) => {
      if (day.enabled) {
        slots.push({
          day_of_week: DAYS[index].value,
          start_time: day.start_time,
          end_time: day.end_time,
        });
      }
    });

    syncMutation.mutate(slots);
  };

  const watchDays = form.watch("days");

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-600" />
          Disponibilidad Horaria
          {doctorName && (
            <span className="text-muted font-normal">— {doctorName}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardBody className="p-5">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-3">
            {DAYS.map((day, index) => (
              <div
                key={day.value}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-[var(--radius-md)] border transition-colors ${
                  watchDays[index]?.enabled
                    ? "border-brand-200 bg-brand-50/30"
                    : "border-border bg-surface-secondary/40"
                }`}
              >
                {/* Day toggle */}
                <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
                  <input
                    type="checkbox"
                    {...form.register(`days.${index}.enabled`)}
                    className="h-4 w-4 rounded accent-brand-600"
                  />
                  <span
                    className={`text-sm font-medium ${
                      watchDays[index]?.enabled ? "text-brand-900" : "text-muted"
                    }`}
                  >
                    {day.label}
                  </span>
                </label>

                {/* Time inputs */}
                <div
                  className={`flex items-center gap-2 flex-1 transition-opacity ${
                    watchDays[index]?.enabled ? "opacity-100" : "opacity-40 pointer-events-none"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted whitespace-nowrap">Desde</Label>
                    <Input
                      type="time"
                      {...form.register(`days.${index}.start_time`)}
                      className="w-32 text-sm"
                      disabled={!watchDays[index]?.enabled}
                    />
                  </div>
                  <span className="text-muted text-sm">—</span>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted whitespace-nowrap">Hasta</Label>
                    <Input
                      type="time"
                      {...form.register(`days.${index}.end_time`)}
                      className="w-32 text-sm"
                      disabled={!watchDays[index]?.enabled}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={syncMutation.isPending}
              className="gap-2"
            >
              {syncMutation.isPending ? (
                <Spinner size="sm" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar Disponibilidad
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
