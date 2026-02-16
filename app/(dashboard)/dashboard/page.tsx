"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardBody } from "@/components/ui/card";
import { Users, CalendarDays, Stethoscope, Package } from "lucide-react";

const quickStats = [
  {
    label: "Pacientes",
    value: "—",
    icon: Users,
    color: "text-brand-600",
    bg: "bg-brand-50",
    href: "/patients",
  },
  {
    label: "Turnos Hoy",
    value: "—",
    icon: CalendarDays,
    color: "text-info",
    bg: "bg-blue-50",
    href: "/appointments",
  },
  {
    label: "Servicios",
    value: "—",
    icon: Stethoscope,
    color: "text-success",
    bg: "bg-emerald-50",
    href: "/services",
  },
  {
    label: "Productos",
    value: "—",
    icon: Package,
    color: "text-warning",
    bg: "bg-amber-50",
    href: "/products",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting()}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted mt-1">
          Bienvenido al sistema de gestión de DermaMED
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="hover:shadow-[var(--shadow-md)] transition-shadow"
            >
              <CardBody className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-[var(--radius-lg)] ${stat.bg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              📅 Próximos Turnos
            </h2>
            <p className="text-sm text-muted">
              Los turnos del día aparecerán aquí cuando implementemos la vista
              de calendario.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              📊 Actividad Reciente
            </h2>
            <p className="text-sm text-muted">
              La actividad reciente del sistema aparecerá aquí en futuras
              versiones.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
