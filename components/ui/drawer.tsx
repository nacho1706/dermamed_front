"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerClose = DialogPrimitive.Close;

const DrawerOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className,
        )}
        {...props}
    />
));
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
        <DrawerOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-sm flex-col",
                "border-l border-border bg-surface shadow-[var(--shadow-xl)]",
                "duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
                className,
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-[var(--radius-sm)] text-muted opacity-70 transition-opacity hover:opacity-100 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 px-6 py-5 border-b border-border",
            className,
        )}
        {...props}
    />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight text-foreground",
            className,
        )}
        {...props}
    />
));
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-muted", className)}
        {...props}
    />
));
DrawerDescription.displayName = "DrawerDescription";

const DrawerBody = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn("flex-1 overflow-y-auto px-6 py-5", className)}
        {...props}
    />
);
DrawerBody.displayName = "DrawerBody";

const DrawerFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex items-center justify-end gap-3 px-6 py-4 border-t border-border",
            className,
        )}
        {...props}
    />
);
DrawerFooter.displayName = "DrawerFooter";

export {
    Drawer,
    DrawerTrigger,
    DrawerClose,
    DrawerOverlay,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerBody,
    DrawerFooter,
};
