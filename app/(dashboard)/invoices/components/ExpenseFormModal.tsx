"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { createExpense } from "@/services/cash-shifts";
import { MinusCircle } from "lucide-react";

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const expenseSchema = z.object({
    amount: z
        .number()
        .min(1, "El monto mínimo es $1."),
    description: z
        .string()
        .min(1, "La descripción es obligatoria.")
        .max(255, "La descripción no puede superar los 255 caracteres."),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

interface ExpenseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    cashShiftId: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExpenseFormModal({
    isOpen,
    onClose,
    cashShiftId,
}: ExpenseFormModalProps) {
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            amount: undefined,
            description: "",
        },
    });

    const mutation = useMutation({
        mutationFn: (values: ExpenseFormValues) =>
            createExpense({
                amount: values.amount,
                description: values.description,
                cash_shift_id: cashShiftId,
            }),
        onSuccess: () => {
            toast.success("Egreso registrado exitosamente.");
            queryClient.invalidateQueries({ queryKey: ["currentCashShift"] });
            queryClient.invalidateQueries({ queryKey: ["cash-shift"] });
            queryClient.invalidateQueries({ queryKey: ["cash-shift", "active"] });
            reset();
            onClose();
        },
        onError: (error: any) => {
            const msg =
                error.response?.data?.message ||
                error.response?.data?.errors?.amount?.[0] ||
                error.response?.data?.errors?.description?.[0] ||
                "Error al registrar el egreso.";
            toast.error(msg);
            // No cerrar el modal en caso de error
        },
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            reset();
            onClose();
        }
    };

    const onSubmit = (values: ExpenseFormValues) => {
        mutation.mutate(values);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MinusCircle className="w-5 h-5 text-red-500" />
                        Registrar Egreso de Caja
                    </DialogTitle>
                    <DialogDescription>
                        Registrá una salida manual de efectivo del turno actual.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    {/* Monto */}
                    <div>
                        <label className="text-sm font-medium text-foreground block mb-1.5">
                            Monto *
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            min="1"
                            placeholder="0.00"
                            autoFocus
                            {...register("amount", { valueAsNumber: true })}
                        />
                        {errors.amount && (
                            <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>
                        )}
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="text-sm font-medium text-foreground block mb-1.5">
                            Descripción *
                        </label>
                        <Input
                            type="text"
                            placeholder="Ej. Pago a proveedor de insumos"
                            {...register("description")}
                        />
                        {errors.description && (
                            <p className="text-xs text-red-600 mt-1">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleOpenChange(false)}
                            disabled={mutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? (
                                <Spinner size="sm" />
                            ) : (
                                "Confirmar Egreso"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
