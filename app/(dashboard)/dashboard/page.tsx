"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getAppointments } from "@/services/appointments";
import { updateAppointment } from "@/services/appointments";
import { getPatients } from "@/services/patients";
import { getProducts } from "@/services/products";
import { ImmediateAttentionModal } from "@/components/features/appointments/immediate-attention-modal";
import { AppointmentModal } from "@/components/features/appointments/appointment-modal";
import { ActiveConsultationAlertModal } from "@/components/features/appointments/active-consultation-alert-modal";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { localToUTC } from "@/lib/timezone";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Users,
  AlertTriangle,
  Plus,
  ChevronRight,
  Clock,
  Eye,
  Package,
  FileText,
  Search,
  Play,
  ArrowRight,
  Edit,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { Appointment } from "@/types";

import { AppointmentStatusBadge } from "@/components/ui/appointment-status-badge";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badge?: { text: string; color: string };
  href?: string;
  progress?: number;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  badge,
  href,
  progress,
}: KpiCardProps) {
  const content = (
    <Card className="group hover:shadow-[var(--shadow-md)] transition-all duration-200 relative overflow-hidden">
      <CardBody className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted font-medium">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {value}
            </p>
            {badge && (
              <span className={`text-xs font-semibold ${badge.color}`}>
                {badge.text}
              </span>
            )}
          </div>
        </div>
        <div
          className={`w-11 h-11 rounded-[var(--radius-lg)] ${iconBg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </CardBody>
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-medical-100">
          <div
            className={`h-full ${iconBg.replace("bg-", "bg-").replace("-50", "-500")} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ─── Quick Action Button ────────────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

function QuickAction({
  label,
  icon: Icon,
  href,
  onClick,
  variant = "secondary",
}: QuickActionProps) {
  const isPrimary = variant === "primary";
  const content = (
    <>
      <div
        className={`w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${
          isPrimary ? "bg-white/20" : "bg-surface-secondary"
        }`}
      >
        <Icon
          className={`w-4 h-4 ${isPrimary ? "text-white" : "text-muted"}`}
        />
      </div>
      <span
        className={`text-sm font-medium flex-1 ${
          isPrimary ? "text-white" : "text-foreground"
        }`}
      >
        {label}
      </span>
      <ChevronRight
        className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
          isPrimary ? "text-white/70" : "text-muted"
        }`}
      />
    </>
  );

  const className = `flex items-center gap-3 w-full px-4 py-3 rounded-[var(--radius-lg)] transition-all duration-300 ease-out group ${
    isPrimary
      ? "bg-brand-600 text-white hover:bg-brand-700 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
      : "bg-surface border border-border/60 hover:border-brand-300 hover:shadow-[var(--shadow-sm)]"
  }`;

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href!} className={className}>
      {content}
    </Link>
  );
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, activeRole, hasRole } = useAuth();
  const [isImmediateModalOpen, setIsImmediateModalOpen] = React.useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = React.useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] =
    React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<
    Appointment | undefined
  >();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayDisplay = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });

  const isDoctor = activeRole?.name === "doctor";
  const canViewFinancials = hasRole("clinic_manager");
  const isReceptionist = activeRole?.name === "receptionist";
  const isClinicManager = activeRole?.name === "clinic_manager";
  const queryClient = useQueryClient();

  // ─── Queries ──────────────────────────────────────────────────────────────

  // 1. Appointments
  // - System Admin: Disabled
  // - Doctor: Filtered by doctor_id
  // - Manager/Receptionist: All
  const { data: appointmentsData, isLoading: isLoadingAppointments } = useQuery(
    {
      queryKey: ["appointments", "today", today, user?.id],
      queryFn: () => {
        const dateFromUTC = localToUTC(today, "00:00");
        const dateToUTC = localToUTC(today, "23:59");
        return getAppointments({
          date_from: dateFromUTC,
          date_to: dateToUTC,
          cantidad: 100,
          doctor_id: isDoctor ? user?.id : undefined,
        });
      },
      enabled: !!user,
    },
  );

  // 3. Products/Stock (Low stock alerts)
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "low-stock"],
    queryFn: () => getProducts({ cantidad: 100 }),
    enabled: (isClinicManager || isReceptionist) && !!user,
  });

  const appointments = appointmentsData?.data || [];
  const activeAppointment = appointments.find(
    (a) => a.status === "in_progress",
  );
  const totalAppointmentsToday = appointments.length;

  // Calculate low stock (only if fetched)
  const lowStockProducts = (productsData?.data || []).filter(
    (p: any) => p.stock <= p.min_stock,
  );
  const lowStockCount = lowStockProducts.length;

  // Pending appointments
  const pendingCount = appointments.filter(
    (a) => a.status === "pending" || a.status === "confirmed",
  ).length;

  // Doctor KPIs calculation
  const waitingRoomCount = appointments.filter(
    (a) => a.status === "in_waiting_room",
  ).length;

  const completedCount = appointments.filter(
    (a) => a.status === "completed",
  ).length;

  const hasLongWaitTime = appointments.some((a) => {
    if (a.status !== "in_waiting_room" || !a.check_in_at) return false;
    const waitTimeMins =
      (new Date().getTime() - new Date(a.check_in_at).getTime()) / 60000;
    return waitTimeMins > 20;
  });

  const sortedAppointments = [...appointments].sort((a, b) => {
    const isABottom = a.status === "completed" || a.status === "cancelled";
    const isBBottom = b.status === "completed" || b.status === "cancelled";

    if (isABottom && !isBBottom) return 1;
    if (!isABottom && isBBottom) return -1;

    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const isLoading =
    isLoadingAppointments ||
    (isLoadingProducts && (isClinicManager || isReceptionist));

  // ─── Render: Clinic & Doctor Views ─────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted mt-1">
            {isDoctor
              ? "Resumen de su agenda médica para hoy."
              : "Resumen de actividad de la clínica."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <CalendarDays className="w-4 h-4" />
          <span className="capitalize">{todayDisplay}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isDoctor ? (
          <>
            <KpiCard
              label="Pacientes en Espera"
              value={isLoading ? "…" : waitingRoomCount}
              icon={Users}
              iconBg={
                waitingRoomCount > 0 ? "bg-amber-100" : "bg-surface-secondary"
              }
              iconColor={
                waitingRoomCount > 0
                  ? "text-amber-600"
                  : "text-muted-foreground"
              }
              badge={
                hasLongWaitTime
                  ? { text: "+20 min demora", color: "text-danger" }
                  : undefined
              }
            />
            <KpiCard
              label="Turnos Finalizados"
              value={
                isLoading
                  ? "…"
                  : `${completedCount} / ${totalAppointmentsToday}`
              }
              icon={CheckCircle2}
              iconBg="bg-brand-50"
              iconColor="text-brand-600"
              progress={
                totalAppointmentsToday > 0
                  ? (completedCount / totalAppointmentsToday) * 100
                  : 0
              }
            />
          </>
        ) : (
          <>
            {/* Appointments Card: non-doctors */}
            <KpiCard
              label="Citas de Hoy"
              value={isLoading ? "…" : totalAppointmentsToday}
              icon={CalendarDays}
              iconBg="bg-blue-50"
              iconColor="text-info"
              href="/appointments"
            />

            {/* Pending Card: non-doctors */}
            <KpiCard
              label="En Espera / Pendientes"
              value={isLoading ? "…" : pendingCount}
              icon={Clock}
              iconBg="bg-amber-50"
              iconColor="text-warning"
              badge={
                pendingCount > 0
                  ? { text: "activos", color: "text-amber-600" }
                  : undefined
              }
            />
          </>
        )}

        {/* Stock: ONLY Manager & Receptionist */}
        {(isClinicManager || isReceptionist) && (
          <KpiCard
            label="Stock Bajo"
            value={isLoading ? "…" : lowStockCount}
            icon={lowStockCount > 0 ? AlertTriangle : Package}
            iconBg={lowStockCount > 0 ? "bg-red-50" : "bg-emerald-50"}
            iconColor={lowStockCount > 0 ? "text-danger" : "text-success"}
            badge={
              lowStockCount > 0
                ? { text: "Atención", color: "text-danger" }
                : undefined
            }
            href="/products"
          />
        )}

        {/* Financials: ONLY Manager (independent of active mode?) - No, the plan says based on active role/hat or including role. 
            The user said "si el usuario incluye el rol clinic_manager". 
            But we decided to show it if they have the hat or if it's relevant.
            Let's show it if hasRole('clinic_manager').
        */}
        {canViewFinancials && (
          <KpiCard
            label="Facturación Mes"
            value="$ 0"
            icon={FileText}
            iconBg="bg-emerald-50"
            iconColor="text-success"
            badge={{ text: "Proyectado", color: "text-emerald-600" }}
            href="/invoices"
          />
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day Summary — Takes 2 cols */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                {isDoctor ? "Mi Agenda del Día" : "Resumen Global del Día"}
              </h2>
              <Link
                href="/appointments"
                className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                Ver Calendario Completo
              </Link>
            </CardHeader>
            <div className="overflow-x-auto">
              {isLoadingAppointments ? (
                <div className="flex items-center justify-center py-16">
                  <Spinner size="md" />
                </div>
              ) : sortedAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarDays className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted font-medium">
                    No hay turnos agendados para {isDoctor ? "usted" : ""} hoy
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isDoctor
                      ? "Disfrute su día libre."
                      : "Los turnos aparecerán aquí automáticamente."}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-[11px] font-bold uppercase tracking-[0.05em] text-medical-600/80 px-6 py-3">
                        Hora
                      </th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-[0.05em] text-medical-600/80 px-6 py-3">
                        Paciente
                      </th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-[0.05em] text-medical-600/80 px-6 py-3 hidden md:table-cell">
                        Tipo
                      </th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-[0.05em] text-medical-600/80 px-6 py-3">
                        Estado
                      </th>
                      <th className="text-right text-[11px] font-bold uppercase tracking-[0.05em] text-medical-600/80 px-6 py-3">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {sortedAppointments.map((appointment: Appointment) => (
                      <AppointmentRow
                        key={appointment.id}
                        appointment={appointment}
                        onEdit={() => {
                          setSelectedAppointment(appointment);
                          setIsAppointmentModalOpen(true);
                        }}
                        hasConflict={!!activeAppointment}
                        onStartConflict={() => setIsConflictModalOpen(true)}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar — Quick Actions + Stock Alerts */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-foreground">
                Acciones Rápidas
              </h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {/* New Quick Action Component for custom logic */}
              <button
                onClick={() => setIsImmediateModalOpen(true)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-[var(--radius-lg)] transition-all duration-200 group bg-danger/10 border border-danger/20 hover:border-danger hover:shadow-[var(--shadow-sm)]"
              >
                <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 bg-danger/20">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                </div>
                <span className="text-sm font-medium flex-1 text-danger text-left">
                  Atención Inmediata
                </span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 text-danger" />
              </button>

              <QuickAction
                label="Nueva Cita"
                icon={Plus}
                onClick={() => setIsAppointmentModalOpen(true)}
                variant="primary"
              />
              {/* Only Manager/Receptionist see Inventory action */}
              {!isDoctor && (
                <QuickAction
                  label="Inventario"
                  icon={Package}
                  href="/products"
                />
              )}
            </CardBody>
          </Card>

          {/* Low Stock Alerts (Not for Doctor) */}
          {!isDoctor && lowStockCount > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="flex flex-row items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h2 className="text-base font-semibold text-foreground">
                  Alertas de Stock
                </h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {lowStockProducts.slice(0, 4).map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted">
                        Mínimo: {product.min_stock} un.
                      </p>
                    </div>
                    <span className="text-sm font-bold text-danger shrink-0">
                      {product.stock} un.
                    </span>
                  </div>
                ))}
                {lowStockCount > 4 && (
                  <Link
                    href="/products"
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Ver todos ({lowStockCount})
                  </Link>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <ImmediateAttentionModal
        isOpen={isImmediateModalOpen}
        onClose={() => setIsImmediateModalOpen(false)}
        activeAppointment={activeAppointment}
      />

      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setSelectedAppointment(undefined);
        }}
        initialData={selectedAppointment}
        onSubmit={async (data) => {
          try {
            if (selectedAppointment) {
              await updateAppointment(selectedAppointment.id, data);
            }
            queryClient.invalidateQueries({ queryKey: ["appointments"] });
            setIsAppointmentModalOpen(false);
            setSelectedAppointment(undefined);
            toast.success(
              selectedAppointment
                ? "Turno actualizado correctamente"
                : "Turno agendado correctamente",
            );
          } catch (error) {
            console.error(error);
            toast.error("Ocurrió un error al guardar el turno");
          }
        }}
      />

      <ActiveConsultationAlertModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        activeAppointment={activeAppointment || null}
      />
    </div>
  );
}

// ─── Appointment Row ────────────────────────────────────────────────────────

function AppointmentRow({
  appointment,
  onEdit,
  hasConflict,
  onStartConflict,
}: {
  appointment: Appointment;
  onEdit?: () => void;
  hasConflict?: boolean;
  onStartConflict?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const time = format(new Date(appointment.start_time), "HH:mm");
  const patientName = appointment.patient
    ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
    : "Paciente";
  const initials = appointment.patient
    ? `${appointment.patient.first_name[0]}${appointment.patient.last_name[0]}`
    : "P";
  const serviceName = appointment.service?.name || "Consulta";
  const statusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "text-brand-600 bg-brand-50 border-brand-100";
      case "in_waiting_room":
        return "text-amber-600 bg-amber-50 border-amber-100";
      case "scheduled":
        return "text-info bg-blue-50 border-blue-100";
      default:
        return "text-muted bg-surface-secondary border-border";
    }
  };

  const [isStarting, setIsStarting] = React.useState(false);

  const handleCompletedClick = () => {
    if (appointment.medical_record?.id) {
      router.push(
        `/patients/${appointment.patient_id}/medical-records/${appointment.medical_record.id}`,
      );
    } else {
      toast.error("No se encontró el registro médico para este turno.");
    }
  };

  const handleStart = async () => {
    if (hasConflict && onStartConflict) {
      onStartConflict();
      return;
    }

    setIsStarting(true);
    try {
      await updateAppointment(appointment.id, { status: "in_progress" });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Consulta iniciada correctamente");
      router.push(
        `/patients/${appointment.patient_id}/medical-records/new?appointment_id=${appointment.id}`,
      );
    } catch (error) {
      console.error(error);
      setIsStarting(false);
      toast.error("Error al iniciar la consulta");
    }
  };

  const renderAction = () => {
    switch (appointment.status) {
      case "scheduled":
      case "pending":
      case "confirmed":
        return (
          <>
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-emerald-600 hover:text-white hover:bg-emerald-500 transition-all disabled:opacity-50"
              title="Iniciar Consulta"
            >
              {isStarting ? (
                <Spinner size="sm" />
              ) : (
                <Play className="w-4 h-4 ml-0.5 fill-current" />
              )}
            </button>
            <button
              onClick={onEdit}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-muted hover:text-brand-600 hover:bg-brand-50 transition-all"
              title="Editar Turno"
            >
              <Edit className="w-4 h-4" />
            </button>
          </>
        );
      case "in_waiting_room":
        return (
          <div className="flex justify-end gap-1.5">
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
          </div>
        );
      case "in_progress":
        return (
          <Link
            href={`/patients/${appointment.patient_id}/medical-records/new?appointment_id=${appointment.id}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-brand-600 hover:text-white hover:bg-brand-500 transition-all"
            title="Ir a Consulta"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        );
      case "completed":
        if (appointment.medical_record?.id) {
          return (
            <Link
              href={`/patients/${appointment.patient_id}/medical-records/${appointment.medical_record.id}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-muted hover:text-foreground hover:bg-surface-secondary transition-all"
              title="Revisar Evolución"
            >
              <Eye className="w-4 h-4" />
            </Link>
          );
        }
        return (
          <Link
            href={`/patients/${appointment.patient_id}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-muted hover:text-foreground hover:bg-surface-secondary transition-all"
            title="Perfil del Paciente"
          >
            <Eye className="w-4 h-4" />
          </Link>
        );
      default:
        return null;
    }
  };

  const opacityClass =
    appointment.status === "cancelled"
      ? "opacity-50 bg-surface-secondary/30 hover:opacity-100"
      : appointment.status === "completed" || appointment.status === "no_show"
        ? "opacity-60 hover:opacity-100"
        : "hover:bg-surface-secondary/50";

  return (
    <tr className={`transition-opacity transition-colors ${opacityClass}`}>
      <td className="px-6 py-3.5">
        <span className="text-sm font-medium text-foreground">{time}</span>
      </td>
      <td className="px-6 py-3.5">
        <Link
          href={`/patients/${appointment.patient_id}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <span
            className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors truncate max-w-[120px] md:max-w-[180px]"
            title={patientName}
          >
            {patientName}
          </span>
        </Link>
      </td>
      <td className="px-6 py-3.5 hidden md:table-cell">
        <span className="text-sm text-muted">{serviceName}</span>
      </td>
      <td className="px-6 py-3.5">
        <AppointmentStatusBadge status={appointment.status} />
      </td>
      <td className="px-6 py-3.5 text-right w-20">
        <div className="flex justify-end gap-2">{renderAction()}</div>
      </td>
    </tr>
  );
}
