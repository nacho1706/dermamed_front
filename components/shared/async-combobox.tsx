"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check, Search, X, Loader2, User } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";

export interface AsyncComboboxProps<T> {
  value?: string | number | null;
  onChange: (value: string | number | null, item?: T) => void;
  fetchFn: (search: string) => Promise<T[]>;
  itemLabel: (item: T) => string | React.ReactNode;
  itemValue: (item: T) => string | number;
  selectedLabel?: string | React.ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

export function AsyncCombobox<T>({
  value,
  onChange,
  fetchFn,
  itemLabel,
  itemValue,
  selectedLabel,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados.",
  disabled = false,
}: AsyncComboboxProps<T>) {
  const [isSearching, setIsSearching] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const debouncedSearch = useDebounce(inputValue, 500);
  const [localSelectedLabel, setLocalSelectedLabel] = useState<
    string | React.ReactNode | null
  >(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["async-combobox", debouncedSearch],
    queryFn: () => fetchFn(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsSearching(false);
        setInputValue("");
      }
    };
    if (isSearching) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearching]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearching(false);
        setInputValue("");
      }
    };
    if (isSearching) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearching]);

  const displayLabel = localSelectedLabel || selectedLabel || null;
  const hasValue = !!(value && displayLabel);

  // Sync: if value is cleared externally (form reset), clear local state
  useEffect(() => {
    if (!value) {
      setLocalSelectedLabel(null);
      setIsSearching(false);
    }
  }, [value]);

  const handleSelect = useCallback(
    (item: T) => {
      const newValue = itemValue(item);
      onChange(newValue, item);
      setLocalSelectedLabel(itemLabel(item));
      setInputValue("");
      setIsSearching(false);
    },
    [onChange, itemValue, itemLabel],
  );

  const handleSwitchToSearch = useCallback(() => {
    if (disabled) return;
    onChange(null);
    setLocalSelectedLabel(null);
    setInputValue("");
    setIsSearching(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [disabled, onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    [],
  );

  const showDropdown = isSearching && inputValue.length > 0;

  // ─── Selected value display ──────────────────────────────────────────
  if (hasValue && !isSearching) {
    return (
      <div className="relative min-w-0 w-full">
        <div
          onClick={handleSwitchToSearch}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-[var(--radius-md)]",
            "bg-surface border border-border",
            "transition-all duration-150",
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-[var(--border-hover)]",
          )}
          title="Clic para cambiar"
        >
          <User className="h-4 w-4 text-brand-500 shrink-0" />
          <span className="flex-1 min-w-0 truncate text-foreground">
            {displayLabel}
          </span>
          {!disabled && <X className="h-3.5 w-3.5 shrink-0 text-muted" />}
        </div>
      </div>
    );
  }

  // ─── Search mode ─────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative min-w-0 w-full">
      {/* Search Input — wrapper handles all visual styling */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 rounded-[var(--radius-md)]",
          "bg-surface border border-border",
          "hover:border-[var(--border-hover)]",
          "transition-all duration-150",
          isSearching && "ring-2 ring-brand-500/20 border-brand-500",
        )}
      >
        <Search className="h-4 w-4 text-muted shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsSearching(true)}
          placeholder={searchPlaceholder}
          disabled={disabled}
          className="flex-1 min-w-0 py-2 text-sm bg-transparent placeholder:text-muted-foreground disabled:cursor-not-allowed focus:outline-none focus-visible:outline-none"
          style={{ outline: "none" }}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="h-4 w-4 text-muted animate-spin shrink-0" />
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div
          className={cn(
            "absolute z-[100] mt-1 w-full rounded-[var(--radius-md)]",
            "bg-surface border border-border shadow-[var(--shadow-md)]",
            "max-h-[220px] overflow-y-auto overflow-x-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-100",
          )}
        >
          {debouncedSearch.length < 2 ? (
            <div className="p-3 text-sm text-center text-muted">
              Escribí al menos 2 caracteres...
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 p-3">
              <Loader2 className="h-4 w-4 text-muted animate-spin" />
              <span className="text-sm text-muted">Buscando...</span>
            </div>
          ) : data && data.length === 0 ? (
            <div className="p-3 text-sm text-center text-muted">
              {emptyText}
            </div>
          ) : (
            <ul className="p-1">
              {data?.map((item) => {
                const isSelected = value === itemValue(item);
                return (
                  <li
                    key={String(itemValue(item))}
                    onClick={() => handleSelect(item)}
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
                    <span className="truncate min-w-0">{itemLabel(item)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
