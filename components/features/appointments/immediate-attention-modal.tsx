"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, Search, UserPlus, Play } from "lucide-react";
import { AsyncCombobox } from "@/components/shared/async-combobox";
import { FilterableSelect } from "@/components/shared/filterable-select";

import { createPatient, getPatients } from "@/services/patients";
import { createAppointment } from "@/services/appointments";
import { getServices } from "@/services/services";
import { useAuth } from "@/contexts/auth-context";
import { localToUTC } from "@/lib/timezone";
import { format } from "date-fns";

// ─── Schemas ────────────────────────────────────────────────────────────────

const existingPatientSchema = z.object({
  patient_id: z.string().min(1, "Seleccione un paciente"),
  service_id: z.string().min(1, "Seleccione un servicio"),
});

const newPatientSchema = z.object({
  first_name: z.string().min(2, "Mínimo 2 caracteres"),
  last_name: z.string().min(2, "Mínimo 2 caracteres"),
  dni: z.string().min(1, "El DNI es requerido"),
  cuit: z.string().optional().nullable().or(z.literal("")),
  service_id: z.string().min(1, "Seleccione un servicio"),
});

type ExistingPatientForm = z.infer<typeof existingPatientSchema>;
type NewPatientForm = z.infer<typeof newPatientSchema>;

interface ImmediateAttentionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImmediateAttentionModal({
  isOpen,
  onClose,
}: ImmediateAttentionModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"search" | "new">("search");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => getServices(),
  });

  // Forms
  const {
    control: controlExisting,
    handleSubmit: handleSubmitExisting,
    formState: { errors: errorsExisting },
    setValue: setExistingPatient,
  } = useForm<ExistingPatientForm>({
    resolver: zodResolver(existingPatientSchema),
    defaultValues: { patient_id: "", service_id: "" },
  });

  const {
    register: registerNew,
    control: controlNew,
    handleSubmit: handleSubmitNew,
    setValue: setNewPatientValue,
    getValues: getNewValues,
    setError: setNewError,
    clearErrors: clearNewErrors,
    formState: { errors: errorsNew },
  } = useForm<NewPatientForm>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      dni: "",
      cuit: "",
      service_id: "",
    },
  });

  // Mutations
  const createAppointmentMutation = useMutation({
    mutationFn: (data: { patient_id: number; service_id: number }) => {
      const nowString = format(new Date(), "yyyy-MM-dd");
      const timeString = format(new Date(), "HH:mm");
      const start_time = localToUTC(nowString, timeString);

      return createAppointment({
        patient_id: data.patient_id,
        doctor_id: user!.id,
        service_id: data.service_id,
        start_time,
        status: "in_progress",
        notes: "Atención inmediata",
      });
    },
    onSuccess: (appointment) => {
      router.push(
        `/patients/${appointment.patient_id}/medical-records/new?appointment_id=${appointment.id}`,
      );
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: createPatient,
  });

  const onExistingSubmit = async (data: ExistingPatientForm) => {
    if (!user) return;
    await createAppointmentMutation.mutateAsync({
      patient_id: Number(data.patient_id),
      service_id: Number(data.service_id),
    });
  };

  const onNewSubmit = async (data: NewPatientForm) => {
    if (!user) return;
    try {
      const newPatient = await createPatientMutation.mutateAsync({
        first_name: data.first_name,
        last_name: data.last_name,
        dni: data.dni,
        cuit: data.cuit,
      });

      await createAppointmentMutation.mutateAsync({
        patient_id: newPatient.id,
        service_id: Number(data.service_id),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDniBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const dni = e.target.value;
    if (dni && dni.length > 5) {
      try {
        const response = await getPatients({ dni });
        if (response.data && response.data.length > 0) {
          const exists = response.data.some((p) => p.dni === dni);
          if (exists) {
            setNewError("dni", {
              type: "manual",
              message: "Este DNI ya está registrado",
            });
          } else {
            clearNewErrors("dni");
          }
        } else {
          clearNewErrors("dni");
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  const isLoading =
    createAppointmentMutation.isPending || createPatientMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="w-5 h-5" />
            <DialogTitle className="text-danger">
              Atención Inmediata
            </DialogTitle>
          </div>
          <p className="text-sm text-muted">
            Crea un turno en curso al instante.
          </p>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full mt-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              Paciente Existente
            </TabsTrigger>
            <TabsTrigger value="new">
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Paciente
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {/* ─── TAB: BÚSQUEDA ───────────────────────────────────────── */}
            <TabsContent value="search" className="space-y-4 m-0">
              <form
                onSubmit={handleSubmitExisting(onExistingSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Buscar Paciente</Label>
                  <Controller
                    name="patient_id"
                    control={controlExisting}
                    render={({ field }) => (
                      <AsyncCombobox
                        value={field.value}
                        onChange={(val) =>
                          field.onChange(val ? String(val) : "")
                        }
                        fetchFn={async (search) => {
                          const res = await getPatients({
                            search,
                            cantidad: 10,
                          });
                          return res.data;
                        }}
                        itemLabel={(p) =>
                          `${p.full_name} | DNI: ${p.dni || "N/A"}`
                        }
                        itemValue={(p) => String(p.id)}
                        placeholder="Buscar por Nombre, Apellido o DNI..."
                        searchPlaceholder="Escribir para buscar..."
                      />
                    )}
                  />
                  {errorsExisting.patient_id && (
                    <p className="text-xs text-danger">
                      {errorsExisting.patient_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Servicio / Motivo</Label>
                  <Controller
                    name="service_id"
                    control={controlExisting}
                    render={({ field }) => (
                      <FilterableSelect
                        value={field.value}
                        onChange={(val) =>
                          field.onChange(val ? String(val) : "")
                        }
                        options={(servicesData?.data || []).map((s) => ({
                          label: s.name,
                          value: String(s.id),
                        }))}
                        placeholder="Seleccionar servicio..."
                      />
                    )}
                  />
                  {errorsExisting.service_id && (
                    <p className="text-xs text-danger">
                      {errorsExisting.service_id.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-danger hover:bg-red-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Spinner className="mr-2" size="sm" />
                  ) : (
                    <Play className="w-4 h-4 mr-2 fill-current" />
                  )}
                  Iniciar Ahora
                </Button>
              </form>
            </TabsContent>

            {/* ─── TAB: NUEVO ──────────────────────────────────────────── */}
            <TabsContent value="new" className="space-y-4 m-0">
              <form
                onSubmit={handleSubmitNew(onNewSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      {...registerNew("first_name")}
                      placeholder="Nombre"
                    />
                    {errorsNew.first_name && (
                      <p className="text-xs text-danger">
                        {errorsNew.first_name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input
                      {...registerNew("last_name")}
                      placeholder="Apellido"
                    />
                    {errorsNew.last_name && (
                      <p className="text-xs text-danger">
                        {errorsNew.last_name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>DNI</Label>
                    <Input
                      {...registerNew("dni")}
                      onBlur={(e) => {
                        registerNew("dni").onBlur(e);
                        handleDniBlur(e);
                      }}
                      placeholder="Ej: 30452758"
                    />
                    {errorsNew.dni && (
                      <p className="text-xs text-danger">
                        {errorsNew.dni.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>CUIT / CUIL (Opcional)</Label>
                    <Controller
                      name="cuit"
                      control={controlNew}
                      render={({ field }) => (
                        <Input
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 11);
                            field.onChange(value);
                            if (value.length === 11) {
                              const extractedDni = value.substring(2, 10);
                              const currentDni = getNewValues("dni");
                              if (!currentDni) {
                                setNewPatientValue("dni", extractedDni, {
                                  shouldValidate: true,
                                });
                              }
                            }
                          }}
                          placeholder="Sin puntos ni guiones"
                        />
                      )}
                    />
                    {errorsNew.cuit && (
                      <p className="text-xs text-danger">
                        {errorsNew.cuit.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Servicio / Motivo</Label>
                  <Controller
                    name="service_id"
                    control={controlNew}
                    render={({ field }) => (
                      <FilterableSelect
                        value={field.value}
                        onChange={(val) =>
                          field.onChange(val ? String(val) : "")
                        }
                        options={(servicesData?.data || []).map((s) => ({
                          label: s.name,
                          value: String(s.id),
                        }))}
                        placeholder="Seleccionar servicio..."
                      />
                    )}
                  />
                  {errorsNew.service_id && (
                    <p className="text-xs text-danger">
                      {errorsNew.service_id.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-danger hover:bg-red-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Spinner className="mr-2" size="sm" />
                  ) : (
                    <Play className="w-4 h-4 mr-2 fill-current" />
                  )}
                  Crear y Atender
                </Button>
              </form>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
