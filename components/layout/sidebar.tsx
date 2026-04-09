"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  Package,
  FileText,
  UserCog,
  X,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["clinic_manager", "doctor", "receptionist"],
  },
  {
    label: "Pacientes",
    href: "/patients",
    icon: Users,
    roles: ["receptionist", "doctor"],
  },
  {
    label: "Turnos",
    href: "/appointments",
    icon: CalendarDays,
    roles: ["receptionist", "doctor"],
  },
  {
    label: "Servicios",
    href: "/services",
    icon: Stethoscope,
    roles: ["clinic_manager"],
  },
  {
    label: "Productos",
    href: "/products",
    icon: Package,
    roles: ["clinic_manager", "receptionist"],
  },
  {
    label: "Facturación",
    href: "/invoices",
    icon: FileText,
    roles: ["clinic_manager", "receptionist"],
  },
  {
    label: "Usuarios",
    href: "/users",
    icon: UserCog,
    roles: ["clinic_manager"],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasAnyRole } = useAuth();

  const filteredItems = navItems.filter((item) => hasAnyRole(item.roles));
  const homeHref = "/dashboard";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-[var(--sidebar-width)] flex flex-col transition-transform duration-300 ease-in-out",
          "bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]",
          "lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo/Brand */}
        <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-white/10 shrink-0">
          <Link
            href={homeHref}
            className="flex items-center gap-3 group"
            onClick={onClose}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">
              Derma<span className="text-brand-400">MED</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="flex flex-col gap-1">
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== homeHref && pathname.startsWith(item.href));
              const Icon = item.icon;

              if (item.href === "/invoices" && (user as any)?.role?.slug === "doctor") {
                return null;
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-all",
                      isActive
                        ? "bg-brand-600/20 text-[var(--sidebar-text-active)] shadow-sm"
                        : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text-active)]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 shrink-0",
                        isActive
                          ? "text-brand-400"
                          : "text-[var(--sidebar-text)]",
                      )}
                    />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          <p className="text-xs text-white/40 text-center">DermaMED PMS v0.2</p>
        </div>
      </aside>
    </>
  );
}
