"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface FilterableSelectOption {
  label: string;
  value: string | number;
}

export interface FilterableSelectProps {
  options: FilterableSelectOption[];
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

export function FilterableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados.",
  disabled = false,
}: FilterableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options by search
  const filteredOptions = search
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSelect = useCallback(
    (option: FilterableSelectOption) => {
      onChange(option.value === value ? null : option.value);
      setOpen(false);
      setSearch("");
    },
    [onChange, value],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setSearch("");
    },
    [onChange],
  );

  const handleTriggerClick = useCallback(() => {
    if (!disabled) {
      setOpen((prev) => !prev);
      setSearch("");
    }
  }, [disabled]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleTriggerClick}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded-[var(--radius-md)]",
          "bg-surface border border-border",
          "hover:border-[var(--border-hover)]",
          "transition-all duration-150 cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
          open && "ring-2 ring-brand-500/20 border-brand-500",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "flex-1 min-w-0 truncate",
            selectedOption ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {selectedOption ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={handleClear}
            className="shrink-0 p-0.5 rounded-[var(--radius-sm)] text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute z-[100] mt-1 w-full rounded-[var(--radius-md)]",
            "bg-surface border border-border shadow-[var(--shadow-md)]",
            "animate-in fade-in-0 zoom-in-95 duration-100",
          )}
        >
          {/* Search filter */}
          {options.length > 5 && (
            <div className="flex items-center gap-2 px-3 border-b border-border">
              <Search className="h-3.5 w-3.5 text-muted shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 min-w-0 py-2.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                autoComplete="off"
              />
            </div>
          )}

          {/* Options list */}
          <ul className="p-1 max-h-[200px] overflow-y-auto overflow-x-hidden">
            {filteredOptions.length === 0 ? (
              <li className="px-2.5 py-2 text-sm text-center text-muted">
                {emptyText}
              </li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value === option.value;
                return (
                  <li
                    key={String(option.value)}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 text-sm rounded-[var(--radius-sm)] cursor-pointer transition-colors",
                      isSelected
                        ? "bg-brand-50 text-brand-700"
                        : "text-foreground hover:bg-surface-secondary",
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSelected ? "opacity-100 text-brand-600" : "opacity-0",
                      )}
                    />
                    <span className="truncate min-w-0">{option.label}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
