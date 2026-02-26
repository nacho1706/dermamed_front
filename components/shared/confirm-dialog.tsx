"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

// ─── ConfirmDialog ───────────────────────────────────────────────────────────

export interface ConfirmDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Called when the user cancels or closes the dialog */
    onClose: () => void;
    /** Called when the user confirms the action */
    onConfirm: () => void;
    /** Dialog title */
    title: string;
    /** Descriptive message to display */
    description: string;
    /** Label for the confirm button — defaults to "Confirmar" */
    confirmLabel?: string;
    /** Visual variant: "danger" shows a red confirm button */
    variant?: "danger" | "default";
    /** Whether a mutation is in progress (disables both buttons) */
    isLoading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirmar",
    variant = "danger",
    isLoading = false,
}: ConfirmDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-1">
                        <div
                            className={`w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0 ${variant === "danger"
                                    ? "bg-red-50"
                                    : "bg-amber-50"
                                }`}
                        >
                            <AlertTriangle
                                className={`w-5 h-5 ${variant === "danger" ? "text-danger" : "text-amber-600"
                                    }`}
                            />
                        </div>
                        <DialogTitle className="text-base">{title}</DialogTitle>
                    </div>
                </DialogHeader>

                <p className="text-sm text-muted leading-relaxed">{description}</p>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        disabled={isLoading}
                        className={
                            variant === "danger"
                                ? "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500"
                                : undefined
                        }
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
