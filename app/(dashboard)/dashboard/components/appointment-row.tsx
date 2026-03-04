"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  Play,
  ArrowRight,
  Eye,
  Undo2,
  MoreHorizontal,
  AlertCircle,
  CircleDollarSign,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { Appointment } from "@/types";
import { AppointmentStatusBadge } from "@/components/ui/appointment-status-badge";
import { updateAppointment } from "@/services/appointments";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppointmentRowProps {
  appointment: Appointment;
  onEdit?: () => void;
  hasConflict?: boolean;
  onStartConflict?: () => void;
  isDelayed?: boolean;
}

export function AppointmentRow({
  appointment,
  onEdit,
  hasConflict,
  onStartConflict,
  isDelayed,
}: AppointmentRowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const isDoctor = hasRole("doctor");
  const time = format(new Date(appointment.scheduled_start_at), "HH:mm");
  const patientName = appointment.patient
    ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
    : "Paciente";
  const initials = appointment.patient
    ? `${appointment.patient.first_name[0]}${appointment.patient.last_name[0]}`
    : "P";
  const serviceName = appointment.service?.name || "Consulta";

  const [isStarting, setIsStarting] = React.useState(false);

  // function handleCompletedClick was unused directly in original component, removing unused
  //   const handleCompletedClick = () => {
  //     if (appointment.medical_record?.id) {
  //       router.push(
  //         `/patients/${appointment.patient_id}/medical-records/${appointment.medical_record.id}`,
  //       );
  //     } else {
  //       toast.error("No se encontró el registro médico para este turno.");
  //     }
  //   };

  const handleStart = async () => {
    if (hasConflict && onStartConflict) {
      onStartConflict();
      return;
    }

    setIsStarting(true);
    try {
      if (isDoctor) {
        // Doctor: start consultation, redirect to medical record
        await updateAppointment(appointment.id, { status: "in_progress" });
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
        toast.success("Consulta iniciada correctamente");
        router.push(
          `/patients/${appointment.patient_id}/medical-records/new?appointment_id=${appointment.id}`,
        );
      } else {
        // Receptionist/Manager: move to waiting room, no redirect
        await updateAppointment(appointment.id, { status: "in_waiting_room" });
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
        toast.success("Paciente ingresado a sala de espera");
        setIsStarting(false);
      }
    } catch (error: any) {
      setIsStarting(false);

      const responseData = error.response?.data;
      let message = isDoctor
        ? "Error al iniciar la consulta"
        : "Error al ingresar a sala de espera";

      if (responseData?.errors) {
        const firstKey = Object.keys(responseData.errors)[0];
        message = responseData.errors[firstKey][0];
      } else if (responseData?.message) {
        message = responseData.message;
      }

      toast.error(message);
    }
  };

  const renderAction = () => {
    let mainAction = null;
    let kebabMenu = null;

    if (!isDoctor) {
      // Receptionist / Manager Matrix
      switch (appointment.status) {
        case "scheduled":
        case "pending":
        case "confirmed":
          mainAction = (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-emerald-600 hover:text-white hover:bg-emerald-500 transition-all disabled:opacity-50"
              title="Ingresar a Espera"
            >
              {isStarting ? (
                <Spinner size="sm" />
              ) : (
                <Play className="w-4 h-4 ml-0.5 fill-current" />
              )}
            </button>
          );
          kebabMenu = (
            <>
              <DropdownMenuItem onClick={onEdit}>Editar Turno</DropdownMenuItem>
              {isDelayed && (
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await updateAppointment(appointment.id, {
                        status: "no_show",
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["appointments"],
                      });
                      toast.success("Turno marcado como ausente");
                    } catch (e) {
                      toast.error("Error al marcar como ausente");
                    }
                  }}
                >
                  Marcar Ausente
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger focus:bg-danger/10"
                onClick={async () => {
                  if (confirm("¿Estás seguro de cancelar este turno?")) {
                    try {
                      await updateAppointment(appointment.id, {
                        status: "cancelled",
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["appointments"],
                      });
                      toast.success("Turno cancelado");
                    } catch (e) {
                      toast.error("Error al cancelar el turno");
                    }
                  }
                }}
              >
                Cancelar Turno
              </DropdownMenuItem>
            </>
          );
          break;

        case "in_waiting_room":
          kebabMenu = (
            <>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await updateAppointment(appointment.id, {
                      status: "scheduled",
                    });
                    queryClient.invalidateQueries({
                      queryKey: ["appointments"],
                    });
                    toast.success("Ingreso deshecho correctamente");
                  } catch (error) {
                    toast.error("Error al deshacer el ingreso");
                  }
                }}
              >
                Deshacer Ingreso
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger focus:bg-danger/10"
                onClick={async () => {
                  if (confirm("¿Estás seguro de cancelar este turno?")) {
                    try {
                      await updateAppointment(appointment.id, {
                        status: "cancelled",
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["appointments"],
                      });
                      toast.success("Turno cancelado");
                    } catch (e) {
                      toast.error("Error al cancelar el turno");
                    }
                  }
                }}
              >
                Cancelar Turno
              </DropdownMenuItem>
            </>
          );
          break;

        case "in_progress":
          // Sin acciones
          break;

        case "completed":
          mainAction = (
            <button
              onClick={() => toast.info("Módulo de caja en desarrollo")}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-emerald-600 hover:text-white hover:bg-emerald-500 transition-all"
              title="Cobrar"
            >
              <CircleDollarSign className="w-4 h-4" />
            </button>
          );
          break;

        case "no_show":
          mainAction = (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-emerald-600 hover:text-white hover:bg-emerald-500 transition-all disabled:opacity-50"
              title="Ingresar a Espera (Llegó tarde)"
            >
              {isStarting ? (
                <Spinner size="sm" />
              ) : (
                <Play className="w-4 h-4 ml-0.5 fill-current" />
              )}
            </button>
          );
          break;

        case "cancelled":
          mainAction = (
            <button
              onClick={async () => {
                try {
                  await updateAppointment(appointment.id, {
                    status: "scheduled",
                  });
                  queryClient.invalidateQueries({ queryKey: ["appointments"] });
                  toast.success("Turno restaurado correctamente");
                } catch (error) {
                  toast.error("Error al restaurar el turno");
                }
              }}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-brand-600 hover:text-white hover:bg-brand-500 transition-all"
              title="Restaurar Turno"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          );
          break;
      }
    } else {
      // Doctor Matrix
      switch (appointment.status) {
        case "scheduled":
        case "pending":
        case "confirmed":
          mainAction = (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-emerald-600 hover:text-white hover:bg-emerald-500 transition-all disabled:opacity-50"
              title="Atender Directo"
            >
              {isStarting ? (
                <Spinner size="sm" />
              ) : (
                <Play className="w-4 h-4 ml-0.5 fill-current" />
              )}
            </button>
          );
          kebabMenu = (
            <>
              <DropdownMenuItem onClick={onEdit}>Editar Turno</DropdownMenuItem>
              {isDelayed && (
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await updateAppointment(appointment.id, {
                        status: "no_show",
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["appointments"],
                      });
                      toast.success("Turno marcado como ausente");
                    } catch (e) {
                      toast.error("Error al marcar como ausente");
                    }
                  }}
                >
                  Marcar Ausente
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger focus:bg-danger/10"
                onClick={async () => {
                  if (confirm("¿Estás seguro de cancelar este turno?")) {
                    try {
                      await updateAppointment(appointment.id, {
                        status: "cancelled",
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["appointments"],
                      });
                      toast.success("Turno cancelado");
                    } catch (e) {
                      toast.error("Error al cancelar el turno");
                    }
                  }
                }}
              >
                Cancelar Turno
              </DropdownMenuItem>
            </>
          );
          break;

        case "in_waiting_room":
          mainAction = (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-emerald-600 hover:text-white hover:bg-emerald-500 border border-emerald-100 hover:border-emerald-500 transition-all duration-200 disabled:opacity-50 group/play"
              title="Llamar / Iniciar"
            >
              {isStarting ? (
                <Spinner size="sm" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5 fill-current transition-transform group-hover/play:scale-110" />
              )}
            </button>
          );
          kebabMenu = (
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await updateAppointment(appointment.id, {
                    status: "scheduled",
                  });
                  queryClient.invalidateQueries({ queryKey: ["appointments"] });
                  toast.success("Turno devuelto a recepción");
                } catch (error) {
                  toast.error("Error al devolver el turno a recepción");
                }
              }}
            >
              Devolver a Recepción
            </DropdownMenuItem>
          );
          break;

        case "in_progress":
          mainAction = (
            <Link
              href={`/patients/${appointment.patient_id}/medical-records/new?appointment_id=${appointment.id}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-brand-600 hover:text-white hover:bg-brand-500 transition-all"
              title="Ir a Consulta"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          );
          kebabMenu = (
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await updateAppointment(appointment.id, {
                    status: "in_waiting_room",
                  });
                  queryClient.invalidateQueries({ queryKey: ["appointments"] });
                  toast.success("Turno devuelto a sala de espera");
                } catch (error) {
                  toast.error("Error al devolver el turno a sala de espera");
                }
              }}
            >
              Devolver a Sala de Espera
            </DropdownMenuItem>
          );
          break;

        case "completed":
          if (appointment.medical_record?.id) {
            mainAction = (
              <Link
                href={`/patients/${appointment.patient_id}/medical-records/${appointment.medical_record.id}`}
                className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-muted hover:text-foreground hover:bg-surface-secondary transition-all"
                title="Revisar Evolución"
              >
                <Eye className="w-4 h-4" />
              </Link>
            );
          }
          break;

        case "no_show":
        case "cancelled":
          // Sin acciones
          break;
      }
    }

    return (
      <div className="flex items-center justify-end gap-2">
        {mainAction}
        {kebabMenu && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-muted hover:text-foreground hover:bg-surface-secondary transition-all focus:outline-none"
                title="Más opciones"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-50">
              {kebabMenu}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  const opacityClass =
    appointment.status === "cancelled"
      ? "opacity-50 bg-surface-secondary/30 hover:opacity-100"
      : appointment.status === "completed" || appointment.status === "no_show"
        ? "opacity-60 hover:opacity-100"
        : "hover:bg-surface-secondary/50";

  const delayedClass = isDelayed
    ? "bg-amber-50 border-l-4 border-amber-400"
    : "border-l-4 border-transparent";

  return (
    <tr
      className={`transition-opacity transition-colors ${opacityClass} ${delayedClass}`}
    >
      <td className="px-6 py-3.5 whitespace-nowrap relative">
        {appointment.is_overbook && (
          <div
            title="Sobreturno"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 rounded bg-orange-100 text-orange-600 cursor-help transition-colors hover:bg-orange-200"
          >
            <AlertCircle className="w-3 h-3" />
          </div>
        )}
        <span className="text-sm font-medium text-foreground">{time}</span>
      </td>
      <td className="px-6 py-3.5 max-w-0 w-full truncate">
        <Link
          href={`/patients/${appointment.patient_id}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <span
              className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors truncate block"
              title={patientName}
            >
              {patientName}
            </span>
            {appointment.doctor && (
              <p className="text-[10px] text-muted-foreground truncate">
                con {appointment.doctor.name}
              </p>
            )}
            {appointment.patient && !appointment.patient.dni && (
              <span className="text-[10px] text-orange-600 font-medium block leading-tight">
                ⚠️ Falta DNI
              </span>
            )}
          </div>
        </Link>
      </td>
      <td className="px-6 py-3.5 hidden md:table-cell max-w-0 w-full">
        <span
          className="text-sm text-muted line-clamp-2 text-wrap"
          title={serviceName}
        >
          {serviceName}
        </span>
      </td>
      <td className="px-6 py-3.5">
        <AppointmentStatusBadge status={appointment.status} />
      </td>
      <td className="px-6 py-3.5 text-right">
        <div className="flex justify-end gap-2">{renderAction()}</div>
      </td>
    </tr>
  );
}
