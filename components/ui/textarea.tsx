import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground",
          "hover:border-[var(--border-hover)]",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-150",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
