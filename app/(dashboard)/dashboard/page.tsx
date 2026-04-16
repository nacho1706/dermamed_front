"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getAppointments } from "@/services/appointments";
import { updateAppointment, createAppointment } from "@/services/appointments";
import { getPatients } from "@/services/patients";
import { getProducts } from "@/services/products";
import { ImmediateAttentionModal } from "@/components/features/appointments/immediate-attention-modal";
import { AppointmentModal } from "@/components/features/appointments/appointment-modal";
import { ActiveConsultationAlertModal } from "@/components/features/appointments/active-consultation-alert-modal";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { localToUTC, getClinicToday } from "@/lib/timezone";
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
  CircleDollarSign,
  Undo2,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { Appointment } from "@/types";

import { AppointmentStatusBadge } from "@/components/ui/appointment-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { KpiCard } from "./components/kpi-card";
import { QuickAction } from "./components/quick-action";
import { AppointmentRow } from "./components/appointment-row";
import { ClinicManagerDashboard } from "./components/clinic-manager-dashboard";

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
  const today = getClinicToday();
  const todayDisplay = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });

  const isDoctor = activeRole?.name === "doctor";
  const canViewFinancials = hasRole("clinic_manager");
  const isReceptionist = activeRole?.name === "receptionist";
  const isClinicManager = activeRole?.name === "clinic_manager";
  const queryClient = useQueryClient();

  // ─── Queries ──────────────────────────────────────────────────────────────

  // 1. Appointments
  // - Doctor: Filtered by doctor_id
  // - Manager/Receptionist: All
  const { data: appointmentsData, isLoading: isLoadingAppointments } = useQuery(
    {
      queryKey: ["appointments", "today", today, user?.id, activeRole?.name],
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

  // Pending appointments (including newly created 'scheduled' ones)
  const pendingCount = appointments.filter(
    (a) => a.status === "pending" || a.status === "confirmed" || a.status === "scheduled",
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

  const sortedAppointments = React.useMemo(() => {
    const list = [...appointments];

    if (isDoctor) {
      // Vista médico — 2 grupos con orden cronológico dentro de cada uno:
      //   Grupo 0: NO finalizados (pending, confirmed, scheduled, in_waiting_room, in_progress)
      //   Grupo 1: Finalizados (completed)
      //   Grupo 2: cancelled / no_show — al fondo
      const DOCTOR_ACTIVE = new Set([
        "pending",
        "confirmed",
        "scheduled",
        "in_waiting_room",
        "in_progress",
      ]);
      const getDoctorGroup = (apt: (typeof list)[number]): number => {
        if (DOCTOR_ACTIVE.has(apt.status)) return 0;
        if (apt.status === "completed") return 1;
        return 2; // cancelled, no_show
      };
      return list.sort((a, b) => {
        const groupDiff = getDoctorGroup(a) - getDoctorGroup(b);
        if (groupDiff !== 0) return groupDiff;
        // Dentro del mismo grupo: orden cronológico ascendente
        return (
          new Date(a.scheduled_start_at).getTime() -
          new Date(b.scheduled_start_at).getTime()
        );
      });
    }

    // Vista Recepción / Manager — 3 grupos estrictos:
    //   Grupo 0: Activos (pending, confirmed, scheduled, in_waiting_room, in_progress)
    //   Grupo 1: Completados sin cobrar (completed sin factura paid)
    //   Grupo 2: Cobrados (completed + invoice paid) + cancelled + no_show
    const ACTIVE_STATUSES = new Set([
      "pending",
      "confirmed",
      "scheduled",
      "in_waiting_room",
      "in_progress",
    ]);

    const getGroup = (apt: (typeof list)[number]): number => {
      if (ACTIVE_STATUSES.has(apt.status)) return 0;
      if (apt.status === "completed" && apt.invoice?.status !== "paid") return 1;
      return 2; // completed+paid, cancelled, no_show
    };

    return list.sort((a, b) => {
      const groupDiff = getGroup(a) - getGroup(b);
      if (groupDiff !== 0) return groupDiff;
      return (
        new Date(a.scheduled_start_at).getTime() -
        new Date(b.scheduled_start_at).getTime()
      );
    });
  }, [appointments, isDoctor]);

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
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isDoctor
              ? "Resumen de su agenda médica para hoy."
              : isClinicManager
              ? "Panel de gestión administrativa y financiera."
              : "Resumen de actividad de la clínica."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CalendarDays className="w-4 h-4" />
          <span className="lowercase">{todayDisplay}</span>
        </div>
      </div>

      {isClinicManager ? (
        <ClinicManagerDashboard appointments={appointments} />
      ) : (
        <>
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
            {/* Appointments & Pending Cards: only receptionist (not clinic_manager) */}
            {!isClinicManager && (
              <>
                <KpiCard
                  label="Citas de Hoy"
                  value={isLoading ? "…" : totalAppointmentsToday}
                  icon={CalendarDays}
                  iconBg="bg-blue-50"
                  iconColor="text-info"
                  href="/appointments"
                />
                <KpiCard
                  label="En espera"
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
                ? { text: "Atención", color: "text-danger", bg: "bg-danger/10" }
                : undefined
            }
            href="/products?stock_status=low"
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
        {/* Day Summary — Hidden for clinic_manager, takes 2 cols for doctor/receptionist */}
        {!isClinicManager && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  {isDoctor ? "Mi Agenda del Día" : "Resumen Global del Día"}
                </h2>
                <Link
                  href="/appointments"
                  className="text-sm text-slate-500 hover:text-brand-600 font-medium transition-colors"
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
                    <p className="text-sm text-slate-500 font-medium">
                      No hay turnos agendados para {isDoctor ? "usted" : ""} hoy
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isDoctor
                        ? "Disfrute su día libre."
                        : "Los turnos aparecerán aquí automáticamente."}
                    </p>
                  </div>
                ) : (
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left text-xs font-medium uppercase tracking-wider text-slate-500 px-6 py-3 w-[10%]">
                          Hora
                        </th>
                        <th className="text-left text-xs font-medium uppercase tracking-wider text-slate-500 px-6 py-3 w-[30%]">
                          Paciente
                        </th>
                        <th className="text-left text-xs font-medium uppercase tracking-wider text-slate-500 px-6 py-3 w-[25%]">
                          Tipo
                        </th>
                        <th className="text-left text-xs font-medium uppercase tracking-wider text-slate-500 px-6 py-3 w-[20%]">
                          Estado
                        </th>
                        <th className="text-left text-xs font-medium uppercase tracking-wider text-slate-500 px-6 py-3 w-[20%]">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedAppointments.map((appointment: Appointment) => {
                        const DELAY_THRESHOLD_MINUTES = 15;
                        const isDelayed =
                          appointment.status === "scheduled" &&
                          Date.now() >
                            new Date(appointment.scheduled_start_at).getTime() +
                              DELAY_THRESHOLD_MINUTES * 60000;

                        return (
                          <AppointmentRow
                            key={appointment.id}
                            appointment={appointment}
                            onEdit={() => {
                              setSelectedAppointment(appointment);
                              setIsAppointmentModalOpen(true);
                            }}
                            hasConflict={!!activeAppointment}
                            onStartConflict={() => setIsConflictModalOpen(true)}
                            isDelayed={isDelayed}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Sidebar — Quick Actions (hidden for clinic_manager) + Admin links (clinic_manager only) */}
        <div className={isClinicManager ? "lg:col-span-3" : ""}>
          <div className="space-y-6">
            {/* Quick Actions: only receptionist and doctor */}
            {!isClinicManager && (
              <Card>
                <CardHeader>
                  <h2 className="text-base font-semibold text-slate-900">
                    Acciones Rápidas
                  </h2>
                </CardHeader>
                <CardBody className="space-y-2">
                  <QuickAction
                    label="Nuevo Turno"
                    icon={Plus}
                    onClick={() => setIsAppointmentModalOpen(true)}
                    variant="primary"
                  />
                  <button
                    onClick={() => setIsImmediateModalOpen(true)}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-[var(--radius-lg)] transition-all duration-200 group bg-brand-50 border border-brand-100 hover:border-brand-300 hover:bg-brand-100/60 hover:shadow-[var(--shadow-sm)]"
                  >
                    <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 bg-brand-100">
                      <UserRoundCheck className="w-4 h-4 text-brand-600" />
                    </div>
                    <span className="text-sm font-medium flex-1 text-brand-700 text-left">
                      Atención Inmediata
                    </span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 text-brand-400" />
                  </button>
                </CardBody>
              </Card>
            )}

            {/* Admin Quick Links: only clinic_manager */}
            {isClinicManager && (
              <Card>
                <CardHeader>
                  <h2 className="text-base font-semibold text-slate-900">
                    Accesos Rápidos
                  </h2>
                </CardHeader>
                <CardBody className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Link
                    href="/invoices"
                    className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-lg)] bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/60 hover:border-emerald-300 transition-all group"
                  >
                    <FileText className="w-6 h-6 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">Facturación</span>
                  </Link>
                  <Link
                    href="/products"
                    className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-lg)] bg-blue-50 border border-blue-100 hover:bg-blue-100/60 hover:border-blue-300 transition-all group"
                  >
                    <Package className="w-6 h-6 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Productos</span>
                  </Link>
                  <Link
                    href="/services"
                    className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-lg)] bg-violet-50 border border-violet-100 hover:bg-violet-100/60 hover:border-violet-300 transition-all group"
                  >
                    <Search className="w-6 h-6 text-violet-600" />
                    <span className="text-xs font-medium text-violet-700">Servicios</span>
                  </Link>
                  <Link
                    href="/users"
                    className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-lg)] bg-slate-50 border border-slate-200 hover:bg-slate-100/60 hover:border-slate-300 transition-all group"
                  >
                    <Users className="w-6 h-6 text-slate-600" />
                    <span className="text-xs font-medium text-slate-700">Usuarios</span>
                  </Link>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
        </>
      )}

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
            } else {
              await createAppointment(data);
            }
            queryClient.invalidateQueries({ queryKey: ["appointments"] });
            setIsAppointmentModalOpen(false);
            setSelectedAppointment(undefined);
            toast.success(
              selectedAppointment
                ? "Turno actualizado correctamente"
                : "Turno agendado correctamente",
            );
          } catch (error: any) {
            const responseData = error.response?.data;
            let message = "Ocurrió un error al guardar el turno";

            if (responseData?.errors) {
              const firstKey = Object.keys(responseData.errors)[0];
              message = responseData.errors[firstKey][0];
            } else if (responseData?.message) {
              message = responseData.message;
            }

            toast.error(message);
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
