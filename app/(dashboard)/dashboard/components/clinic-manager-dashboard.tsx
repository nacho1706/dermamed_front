"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/services/dashboard";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "../../../../components/ui/skeleton";
import type { Appointment } from "@/types";
import { format, subDays } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CalendarCheck,
  AlertOctagon,
  Filter
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface ClinicManagerDashboardProps {
  appointments: Appointment[];
}

const COLORS = ["#0ea5e9", "#14b8a6", "#6366f1", "#f59e0b", "#f43f5e"];

export function ClinicManagerDashboard({ appointments }: ClinicManagerDashboardProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const lastWeek = format(subDays(new Date(), 6), 'yyyy-MM-dd');
  const lastMonth = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [dateFrom, setDateFrom] = useState(() => lastWeek);
  const [dateTo, setDateTo] = useState(() => today);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats", dateFrom, dateTo],
    queryFn: () => getDashboardStats({ date_from: dateFrom, date_to: dateTo }),
  });

  // Calculate live clinic status (this always corresponds to 'today' regardless of filters, based on appointments passed from parent)
  const statuses = appointments.reduce(
    (acc, apt) => {
      if (apt.status === "completed") acc.atendido++;
      else if (apt.status === "in_waiting_room" || apt.status === "in_progress") acc.en_espera++;
      else if (apt.status === "cancelled" || apt.status === "no_show") acc.cancelado++;
      else acc.pendiente++;
      return acc;
    },
    { atendido: 0, en_espera: 0, pendiente: 0, cancelado: 0 }
  );

  const renderKpiValue = (label: string, kpi: { value: number; variation: number }, icon: React.ReactNode, prefix = "") => {
    const isPositive = kpi.variation >= 0;
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardBody className="p-5 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-slate-500">{label}</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              {icon}
            </div>
          </div>
          <div className="flex items-end gap-3 mt-4">
            <h3 className="text-2xl font-bold text-slate-900">
              {prefix}{kpi.value.toLocaleString()}
            </h3>
            <span className={`flex items-center text-xs font-medium mb-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(kpi.variation)}%
            </span>
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
          <Filter className="w-4 h-4 text-slate-400" />
          Filtros de Análisis
        </div>

        <div className="flex flex-wrap items-center justify-end gap-4 w-full sm:w-auto">
          {/* Quick Preset Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => { setDateFrom(today); setDateTo(today); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dateFrom === today && dateTo === today ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Diaria
            </button>
            <button
              onClick={() => { setDateFrom(lastWeek); setDateTo(today); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dateFrom === lastWeek && dateTo === today ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Semanal
            </button>
            <button
              onClick={() => { setDateFrom(lastMonth); setDateTo(today); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dateFrom === lastMonth && dateTo === today ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Mensual
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          {/* Manual Date Inputs */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Desde:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm border-slate-200 rounded-lg text-slate-700 bg-slate-50 px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-auto"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Hasta:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm border-slate-200 rounded-lg text-slate-700 bg-slate-50 px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-[var(--radius-xl)]" />
            ))}
          </div>
          <Skeleton className="h-[350px] rounded-[var(--radius-xl)]" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[250px] rounded-[var(--radius-xl)]" />
            <Skeleton className="h-[250px] rounded-[var(--radius-xl)]" />
          </div>
        </div>
      ) : error || !data ? (
        <div className="text-danger p-4">Error cargando las métricas.</div>
      ) : (
        <>
          {/* 4 Column KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderKpiValue("Ingresos", data.kpis.income, <DollarSign className="w-5 h-5" />, "$ ")}
            {renderKpiValue("Citas Nuevas", data.kpis.appointments, <CalendarCheck className="w-5 h-5" />)}
            {renderKpiValue("Pacientes Nuevos", data.kpis.new_patients, <Users className="w-5 h-5" />)}

            <Card className="hover:shadow-md transition-shadow">
              <CardBody className="p-5 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-slate-500">Alertas Stock</span>
                  <div className={`p-2 rounded-lg ${data.low_stock.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <AlertOctagon className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-end mt-4">
                  <h3 className="text-2xl font-bold text-slate-900">
                    {data.low_stock.length} <span className="text-sm font-medium text-slate-500">ítems críticos</span>
                  </h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Area Chart - Full Width */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-800">Flujo de Turnos (Agendadas vs Efectivas)</h3>
            </CardHeader>
            <CardBody className="p-4 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.weekly_flow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEffective" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => val.slice(5, 10)} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="scheduled" name="Agendadas" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorScheduled)" />
                  <Area type="monotone" dataKey="effective" name="Efectivas" stroke="#2dd4bf" strokeWidth={2} fillOpacity={1} fill="url(#colorEffective)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* 2 Column Layout para el resto */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Element 1: Distribución de Ingresos */}
            <Card className="flex flex-col">
              <CardHeader className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-semibold text-slate-800">Distribución de Ingresos</h3>
              </CardHeader>
              <CardBody className="p-4 flex flex-1 justify-center min-h-[280px]">
                {data.income_distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.income_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="total"
                      >
                        {data.income_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => `$${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-slate-400">Sin datos registrados en el periodo</div>
                )}
              </CardBody>
            </Card>

            {/* Element 2: Estado de Stock y Alertas Conjuntas */}
            <div className="space-y-6 flex flex-col">

              {/* Alertas Predictivas */}
              <Card>
                <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Alertas Predictivas de Insumos</h3>
                  {data.predictive_alerts.length > 0 && <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div>}
                </CardHeader>
                <CardBody className="p-4 space-y-3 max-h-[160px] overflow-auto">
                  {data.predictive_alerts.length > 0 ? (
                    data.predictive_alerts.map((alert, idx) => (
                      <div key={idx} className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                        <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-rose-800 font-medium leading-relaxed">{alert.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500 p-4 text-center bg-slate-50 rounded-xl border border-slate-100">
                      No hay alertas predictivas críticas activas en este momento.
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Live Clinic Status (siempre de hoy) */}
              <Card className="flex-1">
                <CardHeader className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-semibold text-slate-800">Estado de Clínica (Hoy, {format(new Date(), 'dd/MM/yy')})</h3>
                </CardHeader>
                <CardBody className="p-4 grid grid-cols-2 gap-4 h-full">
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-xs font-medium text-emerald-600 mb-1 tracking-wider">Atendidos</span>
                    <span className="text-emerald-700 font-bold text-xl">{statuses.atendido}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <span className="text-xs font-medium text-blue-600 mb-1 tracking-wider">En Espera</span>
                    <span className="text-blue-700 font-bold text-xl">{statuses.en_espera}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <span className="text-xs font-medium text-amber-600 mb-1 tracking-wider">Pendientes</span>
                    <span className="text-amber-700 font-bold text-xl">{statuses.pendiente}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-rose-50 border border-rose-100">
                    <span className="text-xs font-medium text-rose-600 mb-1 tracking-wider">Cancelados</span>
                    <span className="text-rose-700 font-bold text-xl">{statuses.cancelado}</span>
                  </div>
                </CardBody>
              </Card>

            </div>

          </div>
        </>
      )}
    </div>
  );
}
