"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/services/dashboard";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment } from "@/types";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CalendarCheck,
  AlertOctagon,
  ArrowRight,
  Wallet,
  Receipt,
  UserPlus,
  FileWarning
} from "lucide-react";
import Link from "next/link";
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  // Calculate live clinic status
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

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--radius-xl)]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[300px] rounded-[var(--radius-xl)]" />
            <Skeleton className="h-[300px] rounded-[var(--radius-xl)]" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[200px] rounded-[var(--radius-xl)]" />
            <Skeleton className="h-[250px] rounded-[var(--radius-xl)]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-danger p-4">Error cargando las métricas.</div>;
  }

  const { kpis, income_distribution, weekly_flow, low_stock, predictive_alerts } = data;

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
      {/* 4 Column KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderKpiValue("Ingresos de Hoy", kpis.income, <DollarSign className="w-5 h-5" />, "$ ")}
        {renderKpiValue("Citas Nuevas", kpis.appointments, <CalendarCheck className="w-5 h-5" />)}
        {renderKpiValue("Pacientes Nuevos", kpis.new_patients, <Users className="w-5 h-5" />)}
        
        {/* Metric 4: Stock Alerts KPI */}
        <Card className="hover:shadow-md transition-shadow">
          <CardBody className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-slate-500">Alertas Stock</span>
              <div className={`p-2 rounded-lg ${low_stock.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <AlertOctagon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-end mt-4">
              <h3 className="text-2xl font-bold text-slate-900">
                {low_stock.length} <span className="text-sm font-medium text-slate-500">ítems críticos</span>
              </h3>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Grid: 2 Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: 66% Data Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Clinic Status */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-800">Estado de Clínica en Vivo (Hoy)</h3>
            </CardHeader>
            <CardBody className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="text-xs font-medium text-emerald-600 mb-1 uppercase tracking-wider">Atendidos</span>
                <span className="text-emerald-700 font-bold text-xl">{statuses.atendido}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 border border-blue-100">
                <span className="text-xs font-medium text-blue-600 mb-1 uppercase tracking-wider">En Espera</span>
                <span className="text-blue-700 font-bold text-xl">{statuses.en_espera}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-xs font-medium text-amber-600 mb-1 uppercase tracking-wider">Pendientes</span>
                <span className="text-amber-700 font-bold text-xl">{statuses.pendiente}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-rose-50 border border-rose-100">
                <span className="text-xs font-medium text-rose-600 mb-1 uppercase tracking-wider">Cancelados</span>
                <span className="text-rose-700 font-bold text-xl">{statuses.cancelado}</span>
              </div>
            </CardBody>
          </Card>

          {/* Weekly Flow Area Chart */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-800">Flujo Semanal: Agendadas vs Efectivas</h3>
            </CardHeader>
            <CardBody className="p-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[...weekly_flow].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEffective" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => val.slice(5,10)} />
                  <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                  <Area type="monotone" dataKey="scheduled" name="Agendadas" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorScheduled)" />
                  <Area type="monotone" dataKey="effective" name="Efectivas" stroke="#2dd4bf" strokeWidth={2} fillOpacity={1} fill="url(#colorEffective)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Income Distribution Donut Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-semibold text-slate-800">Distribución de Ingresos</h3>
              </CardHeader>
              <CardBody className="p-4 flex justify-center h-[280px]">
                {income_distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={income_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="total"
                      >
                        {income_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => `$${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-slate-400">Sin datos registrados</div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-semibold text-slate-800">Estado de Stock (Críticos)</h3>
              </CardHeader>
              <CardBody className="p-0 overflow-auto h-[280px]">
                {low_stock.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {low_stock.map((item) => (
                      <li key={item.id} className="p-4 hover:bg-slate-50 flex justify-between items-center transition-colors">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-rose-500 font-medium mt-0.5">Stock crítico</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-800">{item.stock}</p>
                          <p className="text-xs text-slate-400">Min: {item.min_stock}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-slate-400">Todo el stock en orden</div>
                )}
              </CardBody>
            </Card>
          </div>

        </div>

        {/* Right Column: 33% Quick Actions & Alerts */}
        <div className="space-y-6">
          


          <Card>
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Alertas Predictivas</h3>
              <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              {predictive_alerts.length > 0 ? (
                predictive_alerts.map((alert, idx) => (
                  <div key={idx} className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                    <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-800 font-medium leading-relaxed">{alert.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 p-4 text-center bg-slate-50 rounded-xl border border-slate-100">
                  No hay alertas críticas que requieran atención en este momento.
                </div>
              )}
            </CardBody>
          </Card>

        </div>

      </div>
    </div>
  );
}
