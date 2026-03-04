import type { AppointmentStatus } from "@/types";

const statusConfig: Record<
  AppointmentStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  scheduled: {
    label: "Programado",
    dot: "bg-blue-400",
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
  },
  in_waiting_room: {
    label: "En Espera",
    dot: "bg-amber-400 animate-pulse",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
  },
  in_progress: {
    label: "En Consulta",
    dot: "bg-brand-500",
    bg: "bg-brand-50 border-brand-200",
    text: "text-brand-700",
  },
  completed: {
    label: "Finalizado",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  cancelled: {
    label: "Cancelado",
    dot: "bg-red-400",
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
  },
  no_show: {
    label: "Ausente",
    dot: "bg-red-500", // Using destructive color for no show too
    bg: "bg-red-50 border-red-200",
    text: "text-red-800",
  },
  // Compatibility with older variations if ever needed by types
  pending: {
    label: "Pendiente",
    dot: "bg-blue-400",
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
  },
  confirmed: {
    label: "Confirmado",
    dot: "bg-blue-500",
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
  },
};

export function AppointmentStatusBadge({
  status,
}: {
  status: AppointmentStatus | string;
}) {
  // Cast to valid keys or fallback to scheduled
  const config =
    statusConfig[status as AppointmentStatus] || statusConfig.scheduled;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
