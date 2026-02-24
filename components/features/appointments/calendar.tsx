"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  eachDayOfInterval,
  isSameDay,
  addMinutes,
  differenceInMinutes,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Appointment } from "@/types";

interface CalendarProps {
  appointments: Appointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onSlotClick: (date: Date) => void;
  workingHours?: { start: number; end: number };
}

const HOUR_HEIGHT = 72; // px per hour — more breathing room

const statusConfig: Record<
  string,
  { bg: string; border: string; text: string; dot: string }
> = {
  scheduled: {
    bg: "bg-blue-500",
    border: "border-blue-600",
    text: "text-white",
    dot: "bg-white",
  },
  in_waiting_room: {
    bg: "bg-amber-400", // New amber/warning color
    border: "border-amber-500",
    text: "text-amber-900",
    dot: "bg-white animate-pulse",
  },
  in_progress: {
    bg: "bg-emerald-500", // New emerald/success color
    border: "border-emerald-600",
    text: "text-white",
    dot: "bg-white",
  },
  completed: {
    bg: "bg-slate-400 opacity-60", // New mute color
    border: "border-slate-500",
    text: "text-white",
    dot: "bg-slate-100",
  },
  cancelled: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    dot: "bg-red-400",
  },
  no_show: {
    bg: "bg-red-100",
    border: "border-red-300",
    text: "text-red-800",
    dot: "bg-red-500",
  },
  pending: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    dot: "bg-amber-400",
  },
  confirmed: {
    bg: "bg-blue-500",
    border: "border-blue-600",
    text: "text-white",
    dot: "bg-white",
  },
};

const defaultStatus = {
  bg: "bg-neutral-50",
  border: "border-neutral-200",
  text: "text-neutral-700",
  dot: "bg-neutral-400",
};

export function Calendar({
  appointments,
  currentDate,
  onDateChange,
  onAppointmentClick,
  onSlotClick,
  workingHours = { start: 9, end: 20 },
}: CalendarProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  const hours = useMemo(() => {
    const arr = [];
    for (let i = workingHours.start; i < workingHours.end; i++) {
      arr.push(i);
    }
    return arr;
  }, [workingHours]);

  const handlePrevWeek = () => onDateChange(addDays(currentDate, -7));
  const handleNextWeek = () => onDateChange(addDays(currentDate, 7));
  const handleToday = () => onDateChange(new Date());

  const getAppointmentStyle = (appointment: Appointment) => {
    const start = parseISO(appointment.start_time);
    const end = parseISO(appointment.end_time);

    const startHour = start.getHours();
    const startMinutes = start.getMinutes();
    const minutesFromStart =
      (startHour - workingHours.start) * 60 + startMinutes;
    const duration = differenceInMinutes(end, start);

    return {
      top: `${(minutesFromStart / 60) * HOUR_HEIGHT}px`,
      height: `${Math.max((duration / 60) * HOUR_HEIGHT, 28)}px`,
    };
  };

  // Week range text like "10 – 16 Feb, 2025"
  const weekEnd = addDays(weekStart, 6);
  const weekRangeText = `${format(weekStart, "dd")} – ${format(weekEnd, "dd MMM, yyyy", { locale: es })}`;

  return (
    <div className="flex flex-col h-full bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-sm)] overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevWeek}
              className="h-8 w-8 p-0 text-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextWeek}
              className="h-8 w-8 p-0 text-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground capitalize">
              {format(currentDate, "MMMM yyyy", { locale: es })}
            </h2>
            <p className="text-xs text-muted mt-0.5">{weekRangeText}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs"
          >
            Hoy
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-1 overflow-y-auto relative">
        {/* Time Sidebar */}
        <div className="w-16 flex-shrink-0 border-r border-border bg-surface-secondary/50 sticky left-0 z-10">
          {/* Header spacer matching day header height */}
          <div className="h-14 border-b border-border"></div>
          {hours.map((hour) => (
            <div
              key={hour}
              className="border-b border-border/50 text-[11px] text-muted font-medium pr-3 text-right relative"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              <span className="relative -top-2">
                {String(hour).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>

        {/* Days Columns */}
        <div className="flex flex-1 min-w-[800px]">
          {weekDays.map((day) => {
            const dayAppointments = appointments.filter((apt) =>
              isSameDay(parseISO(apt.start_time), day),
            );
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className="flex-1 border-r border-border/50 last:border-r-0 min-w-[120px] relative"
              >
                {/* Day Header */}
                <div
                  className={cn(
                    "h-14 border-b border-border flex flex-col items-center justify-center sticky top-0 bg-surface z-10 gap-0.5",
                    isToday && "bg-brand-50/50",
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-wider",
                      isToday ? "text-brand-600" : "text-muted",
                    )}
                  >
                    {format(day, "EEE", { locale: es })}
                  </span>
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                      isToday ? "bg-brand-600 text-white" : "text-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>

                {/* Day Slots & Appointments */}
                <div className="relative">
                  {/* Background Grid Lines */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-border/30 hover:bg-brand-50/20 cursor-pointer transition-colors"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      onClick={() => {
                        const slotDate = new Date(day);
                        slotDate.setHours(hour, 0, 0, 0);
                        onSlotClick(slotDate);
                      }}
                    >
                      {/* Half-hour divider */}
                      <div
                        className="border-b border-border/15"
                        style={{ marginTop: `${HOUR_HEIGHT / 2}px` }}
                      />
                    </div>
                  ))}

                  {/* Current Time Indicator */}
                  {isToday && (
                    <div
                      className="absolute left-0 right-0 z-10 pointer-events-none"
                      style={{
                        top: `${(((new Date().getHours() - workingHours.start) * 60 + new Date().getMinutes()) / 60) * HOUR_HEIGHT}px`,
                      }}
                    >
                      <div className="flex items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1 shadow-sm" />
                        <div className="flex-1 border-t-2 border-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Handle overlapping appointments calculation */}
                  {(() => {
                    const sortedDayApts = [...dayAppointments].sort(
                      (a, b) =>
                        new Date(a.start_time).getTime() -
                        new Date(b.start_time).getTime(),
                    );
                    const overlappedGroups: Appointment[][] = [];
                    for (const a of sortedDayApts) {
                      let placed = false;
                      for (const group of overlappedGroups) {
                        const last = group[group.length - 1];
                        if (new Date(last.end_time) <= new Date(a.start_time)) {
                          group.push(a);
                          placed = true;
                          break;
                        }
                      }
                      if (!placed) overlappedGroups.push([a]);
                    }

                    const aptColumnMap = new Map<
                      string,
                      { col: number; total: number }
                    >();
                    for (let c = 0; c < overlappedGroups.length; c++) {
                      for (const a of overlappedGroups[c]) {
                        aptColumnMap.set(a.id.toString(), {
                          col: c,
                          total: overlappedGroups.length,
                        });
                      }
                    }

                    return sortedDayApts.map((apt) => {
                      const config = statusConfig[apt.status] || defaultStatus;
                      const baseStyle = getAppointmentStyle(apt);
                      const heightNum = parseInt(baseStyle.height);

                      const colInfo = aptColumnMap.get(apt.id.toString()) || {
                        col: 0,
                        total: 1,
                      };
                      const widthPct = 100 / colInfo.total;
                      const leftPct = colInfo.col * widthPct;

                      const style = {
                        ...baseStyle,
                        left: `calc(${leftPct}% + 4px)`,
                        width: `calc(${widthPct}% - 8px)`,
                      };

                      return (
                        <div
                          key={apt.id}
                          className={cn(
                            "absolute rounded-md px-2 py-1 text-xs border cursor-pointer",
                            "transition-all hover:z-20 hover:shadow-md hover:-translate-y-0.5",
                            config.bg,
                            config.border,
                            config.text,
                          )}
                          style={style}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <div
                              className={cn(
                                "h-1.5 w-1.5 rounded-full flex-shrink-0",
                                config.dot,
                              )}
                            />
                            <span className="font-semibold truncate">
                              {apt.patient?.full_name || "Paciente"}
                            </span>
                          </div>
                          {heightNum > 32 && (
                            <div className="flex items-center gap-1 text-[10px] opacity-80 mt-0.5 ml-3">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              {format(parseISO(apt.start_time), "HH:mm")} –{" "}
                              {format(parseISO(apt.end_time), "HH:mm")}
                            </div>
                          )}
                          {heightNum > 50 && (
                            <div className="truncate mt-0.5 text-[10px] opacity-70 ml-3">
                              {apt.service?.name}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
