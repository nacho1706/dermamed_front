import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-3 py-2 text-sm rounded-[var(--radius-md)]",
            "bg-surface border border-border",
            "placeholder:text-muted-foreground",
            "hover:border-[var(--border-hover)]",
            "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-150",
            error && "border-danger focus:ring-danger/20 focus:border-danger",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
