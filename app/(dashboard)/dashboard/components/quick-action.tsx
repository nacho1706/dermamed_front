"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface QuickActionProps {
  label: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export function QuickAction({
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

  // Ensure href is defined before accessing it if not an onClick, or cast gracefully
  return (
    <Link href={href || "#"} className={className}>
      {content}
    </Link>
  );
}
