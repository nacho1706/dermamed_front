"use client";

import React from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badge?: { text: string; color: string; bg?: string };
  href?: string;
  progress?: number;
}

export function KpiCard({
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
      <CardBody className="px-5 py-4 flex flex-col justify-center">
        <div className="flex justify-between items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground line-clamp-1">
            {label}
          </p>
          <div
            className={`w-9 h-9 rounded-[var(--radius-md)] ${iconBg} flex items-center justify-center shrink-0`}
          >
            <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
          </div>
        </div>
        <div className="flex items-end gap-2 mt-1">
          <p className="text-[28px] font-bold text-foreground leading-none tracking-tight">
            {value}
          </p>
          {badge && (
            <span
              className={`text-[11px] mb-0.5 font-bold uppercase tracking-wider ${badge.color} ${
                badge.bg ? `${badge.bg} px-1.5 py-[2px] rounded-md` : ""
              }`}
            >
              {badge.text}
            </span>
          )}
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
