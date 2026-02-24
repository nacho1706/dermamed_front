"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useDebounce } from "use-debounce";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";

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
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [debouncedSearch] = useDebounce(inputValue, 500);

  const { data, isLoading } = useQuery({
    queryKey: ["async-combobox", debouncedSearch],
    queryFn: () => fetchFn(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  // Refresh data when modal opens if needed
  useEffect(() => {
    if (open && value) {
      setInputValue("");
    }
  }, [open, value]);

  const selectedItem = data?.find((item) => itemValue(item) === value);
  const displayLabel = selectedItem
    ? itemLabel(selectedItem)
    : selectedLabel || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal bg-background"
          disabled={disabled}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Spinner size="sm" />
              </div>
            ) : data && data.length === 0 && debouncedSearch.length >= 2 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : !data && debouncedSearch.length < 2 ? (
              <div className="p-4 text-sm text-center text-muted">
                Escribe al menos 2 caracteres...
              </div>
            ) : null}
            <CommandGroup>
              {data?.map((item) => (
                <CommandItem
                  key={itemValue(item)}
                  value={String(itemValue(item))}
                  onSelect={() => {
                    const newValue = itemValue(item);
                    onChange(newValue === value ? null : newValue, item);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === itemValue(item) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {itemLabel(item)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
