"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ActiveConsultationAlertModal } from "@/components/features/appointments/active-consultation-alert-modal";
import type { Appointment } from "@/types";

import { createPatient, getPatients } from "@/services/patients";
import { createAppointment } from "@/services/appointments";
import { getServices } from "@/services/services";
import { getUsers } from "@/services/users";
import { useAuth } from "@/contexts/auth-context";
import { localToUTC } from "@/lib/timezone";
import { format, addMinutes } from "date-fns";
import { toast } from "sonner";

// ─── Schemas ────────────────────────────────────────────────────────────────

const existingPatientSchema = z.object({
  patient_id: z.string().min(1, "Seleccione un paciente"),
  service_id: z.string().min(1, "Seleccione un servicio"),
  doctor_id: z.string().optional(),
});

const newPatientSchema = z.object({
  first_name: z.string().min(2, "Mínimo 2 caracteres"),
  last_name: z.string().min(2, "Mínimo 2 caracteres"),
  dni: z.string().min(1, "El DNI es requerido"),
  cuit: z.string().optional().nullable().or(z.literal("")),
  service_id: z.string().min(1, "Seleccione un servicio"),
  doctor_id: z.string().optional(),
});

type ExistingPatientForm = z.infer<typeof existingPatientSchema>;
type NewPatientForm = z.infer<typeof newPatientSchema>;

interface ImmediateAttentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAppointment?: Appointment | null;
}

export function ImmediateAttentionModal({
  isOpen,
  onClose,
  activeAppointment,
}: ImmediateAttentionModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole("doctor");
  const [activeTab, setActiveTab] = useState<"search" | "new">("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => getServices(),
  });

  // Fetch doctors for the selector (only needed for non-doctors)
  const { data: doctorsData } = useQuery({
    queryKey: ["users", "doctors"],
    queryFn: () => getUsers({ role: "doctor", is_active: true, cantidad: 100 }),
    enabled: !isDoctor,
  });

  // Forms
  const {
    control: controlExisting,
    handleSubmit: handleSubmitExisting,
    formState: { errors: errorsExisting },
    setValue: setExistingPatient,
  } = useForm<ExistingPatientForm>({
    resolver: zodResolver(existingPatientSchema),
    defaultValues: { patient_id: "", service_id: "", doctor_id: "" },
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
      doctor_id: "",
    },
  });

  // Mutations
  const createAppointmentMutation = useMutation({
    mutationFn: (data: {
      patient_id: number;
      service_id: number;
      doctor_id?: string;
    }) => {
      const now = new Date();
      const nowString = format(now, "yyyy-MM-dd");
      const timeString = format(now, "HH:mm");
      const start_time = localToUTC(nowString, timeString);

      const service = servicesData?.data.find(
        (s) => String(s.id) === String(data.service_id),
      );
      // Fallback to 30 mins if duration is not found
      const duration = service?.duration_minutes || 30;

      const endTimeDate = addMinutes(now, duration);
      const endString = format(endTimeDate, "yyyy-MM-dd");
      const endTimeString = format(endTimeDate, "HH:mm");
      const end_time = localToUTC(endString, endTimeString);

      // Doctor: use own ID. Non-doctor: use selected doctor_id.
      const resolvedDoctorId = isDoctor ? user!.id : Number(data.doctor_id);

      return createAppointment({
        patient_id: data.patient_id,
        doctor_id: resolvedDoctorId,
        service_id: data.service_id,
        start_time,
        end_time,
        status: isDoctor ? "in_progress" : "in_waiting_room",
        notes: isDoctor ? "Atención inmediata" : "Ingreso sin turno",
      });
    },
    onSuccess: (appointment) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      if (isDoctor) {
        // Doctor: redirect to medical records
        router.push(
          `/patients/${appointment.patient_id}/medical-records/new?appointment_id=${appointment.id}`,
        );
      } else {
        // Receptionist/Manager: stay, show toast
        toast.success("Paciente ingresado a sala de espera");
        onClose();
      }
    },
    onError: (error: any) => {
      console.error("Create Appointment Error:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Error al crear el turno");
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (error: any) => {
      console.error("Create Patient Error:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Error al crear paciente");
    },
  });

  const onExistingSubmit = async (data: ExistingPatientForm) => {
    if (!user) return;
    // Non-doctor: validate doctor selection
    if (!isDoctor && !data.doctor_id) {
      toast.error("Debe seleccionar un médico");
      return;
    }
    if (activeAppointment) {
      setIsConflictModalOpen(true);
      return;
    }
    await createAppointmentMutation.mutateAsync({
      patient_id: Number(data.patient_id),
      service_id: Number(data.service_id),
      doctor_id: data.doctor_id,
    });
  };

  const onNewSubmit = async (data: NewPatientForm) => {
    if (!user) return;
    // Non-doctor: validate doctor selection
    if (!isDoctor && !data.doctor_id) {
      toast.error("Debe seleccionar un médico");
      return;
    }
    if (activeAppointment) {
      setIsConflictModalOpen(true);
      return;
    }
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
        doctor_id: data.doctor_id,
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
              {isDoctor ? "Atención Inmediata" : "Ingreso sin Turno"}
            </DialogTitle>
          </div>
          <p className="text-sm text-muted">
            {isDoctor
              ? "Crea un turno en curso al instante."
              : "Registra un paciente en sala de espera sin turno previo."}
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

                {/* Doctor selector: visible and required for non-doctors */}
                {!isDoctor && (
                  <div className="space-y-2">
                    <Label>
                      Médico Asignado <span className="text-danger">*</span>
                    </Label>
                    <Controller
                      name="doctor_id"
                      control={controlExisting}
                      render={({ field }) => (
                        <FilterableSelect
                          value={field.value || ""}
                          onChange={(val) =>
                            field.onChange(val ? String(val) : "")
                          }
                          options={(doctorsData?.data || []).map((d) => ({
                            label: d.name,
                            value: String(d.id),
                          }))}
                          placeholder="Seleccionar médico..."
                        />
                      )}
                    />
                  </div>
                )}

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
                  {isDoctor ? "Iniciar Ahora" : "Ingresar a Espera"}
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

                {/* Doctor selector: visible and required for non-doctors */}
                {!isDoctor && (
                  <div className="space-y-2">
                    <Label>
                      Médico Asignado <span className="text-danger">*</span>
                    </Label>
                    <Controller
                      name="doctor_id"
                      control={controlNew}
                      render={({ field }) => (
                        <FilterableSelect
                          value={field.value || ""}
                          onChange={(val) =>
                            field.onChange(val ? String(val) : "")
                          }
                          options={(doctorsData?.data || []).map((d) => ({
                            label: d.name,
                            value: String(d.id),
                          }))}
                          placeholder="Seleccionar médico..."
                        />
                      )}
                    />
                  </div>
                )}

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
                  {isDoctor ? "Crear y Atender" : "Crear e Ingresar a Espera"}
                </Button>
              </form>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
      <ActiveConsultationAlertModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        activeAppointment={activeAppointment || null}
      />
    </Dialog>
  );
}
