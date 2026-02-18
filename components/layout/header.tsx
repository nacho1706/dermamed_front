"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getInitials } from "@/lib/utils";
import { Menu, LogOut, User, ChevronDown } from "lucide-react";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    window.location.href = "/login";
  };

  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    doctor: "Doctor",
    receptionist: "Recepcionista",
  };

  return (
    <header className="h-[var(--header-height)] bg-surface border-b border-border px-4 lg:px-6 flex items-center justify-between shrink-0">
      {/* Left — Menu toggle (mobile) */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 -ml-2 rounded-[var(--radius-md)] hover:bg-surface-secondary text-muted hover:text-foreground transition-colors cursor-pointer"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile brand */}
      <div className="lg:hidden flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
          <span className="text-white font-bold text-xs">D</span>
        </div>
        <span className="font-semibold text-foreground text-sm">
          Derma<span className="text-brand-600">MED</span>
        </span>
      </div>

      {/* Spacer for desktop */}
      <div className="hidden lg:block" />

      {/* Right — User menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 py-1.5 px-2 rounded-[var(--radius-md)] hover:bg-surface-secondary transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
            {user ? getInitials(user.name) : "?"}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-foreground leading-tight">
              {user?.name || "Usuario"}
            </span>
            <span className="text-xs text-muted leading-tight">
              {user?.role?.name
                ? roleLabel[user.role.name] || user.role.name
                : ""}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted hidden sm:block" />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-lg)] py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 border-b border-border sm:hidden">
              <p className="text-sm font-medium text-foreground">
                {user?.name || "Usuario"}
              </p>
              <p className="text-xs text-muted">
                {user?.role?.name
                  ? roleLabel[user.role.name] || user.role.name
                  : ""}
              </p>
            </div>
            <button
              onClick={() => setDropdownOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-secondary transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 text-muted" />
              Mi perfil
            </button>
            <hr className="my-1 border-border" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
