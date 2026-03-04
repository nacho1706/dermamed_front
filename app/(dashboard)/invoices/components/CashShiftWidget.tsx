"use client";

import React, { useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getCurrentCashShift,
    openCashShift,
    closeCashShift,
} from "@/services/cash-shifts";
import { toast } from "sonner";
import { formatLocalDateTime } from "@/lib/timezone";
import { useRouter } from "next/navigation";
import { Wallet, AlertCircle, CheckCircle2, History } from "lucide-react";
import { CashShiftHistoryModal } from "./CashShiftHistoryModal";

function formatCurrency(value: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
    }).format(value);
}

export function CashShiftWidget() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [balanceInput, setBalanceInput] = useState("");
    const [justification, setJustification] = useState("");

    const { data: cashShift, isLoading } = useQuery({
        queryKey: ["currentCashShift"],
        queryFn: getCurrentCashShift,
    });

    const isOpen = !!cashShift;

    const openMutation = useMutation({
        mutationFn: (balance: number) => openCashShift(balance),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentCashShift"] });
            toast.success("Caja Diaria abierta exitosamente");
            setIsModalOpen(false);
            setBalanceInput("");
            router.refresh();
        },
        onError: () => toast.error("Error al abrir la caja diaria"),
    });

    const closeMutation = useMutation({
        mutationFn: (data: { balance: number; justification?: string }) => closeCashShift(data.balance, data.justification),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentCashShift"] });
            toast.success("Caja Diaria cerrada exitosamente");
            setIsModalOpen(false);
            setBalanceInput("");
            setJustification("");
            router.refresh();
        },
        onError: (error: any) => {
            const msg =
                error.response?.data?.message ||
                error.response?.data?.errors?.cash_shift?.[0] ||
                "Error al cerrar la caja diaria";
            toast.error(msg);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const balance = parseFloat(balanceInput);
        if (isNaN(balance) || balance < 0) {
            toast.error("Por favor, ingrese un monto válido");
            return;
        }

        if (isOpen) {
            const isDiscrepancy = cashShift?.expected_balance !== undefined &&
                Math.abs(balance - cashShift.expected_balance) > 0.01;

            if (isDiscrepancy && (!justification || justification.length < 10)) {
                toast.error("Debe ingresar una justificación detallada (min 10 caracteres) por el descuadre.");
                return;
            }

            closeMutation.mutate({ balance, justification: isDiscrepancy ? justification : undefined });
        } else {
            openMutation.mutate(balance);
        }
    };

    if (isLoading) {
        return (
            <Card className="mb-6">
                <CardBody className="flex justify-center items-center py-6">
                    <Spinner size="md" />
                </CardBody>
            </Card>
        );
    }

    const isPending = openMutation.isPending || closeMutation.isPending;

    return (
        <>
            <Card className={`mb-6 border-l-4 ${isOpen ? 'border-emerald-500' : 'border-red-500'}`}>
                <CardBody className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                Panel de Caja Diaria
                                {!isOpen ? (
                                    <span className="flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Cerrada
                                    </span>
                                ) : (
                                    <span className="flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Abierta
                                    </span>
                                )}
                            </h2>
                            {isOpen && cashShift && (
                                <div className="mt-3 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg">
                                        <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wider mb-1">Efectivo Actual en Caja</p>
                                        <p className="text-2xl font-black text-emerald-700">{formatCurrency(cashShift.expected_balance || 0)}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 text-xs text-muted">
                                        <p>Apertura: {formatLocalDateTime(cashShift.opening_time)}</p>
                                        <p>Monto Inicial: <span className="font-semibold text-foreground">{formatCurrency(cashShift.opening_balance || 0)}</span></p>
                                    </div>
                                </div>
                            )}
                            {!isOpen && (
                                <p className="text-sm text-muted mt-1">La caja está cerrada. Debes abrirla para operar.</p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button variant="secondary" onClick={() => setIsHistoryOpen(true)} className="w-full sm:w-auto text-muted-foreground border-border bg-surface-secondary/50 hover:bg-surface-secondary/80 focus:bg-surface-secondary/80">
                            <History className="w-4 h-4 mr-2" />
                            Historial
                        </Button>
                        {!isOpen ? (
                            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
                                Abrir Caja Diaria
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto border-danger text-danger hover:bg-danger/10">
                                Cerrar Caja
                            </Button>
                        )}
                    </div>
                </CardBody>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isOpen ? 'Cerrar Caja Diaria' : 'Abrir Caja Diaria'}</DialogTitle>
                        <DialogDescription className="hidden">Agrega el monto para gestionar la caja diaria</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-foreground block mb-2">
                                {isOpen ? 'Efectivo en Caja (Cierre) *' : 'Monto Inicial (Apertura) *'}
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={balanceInput}
                                onChange={(e) => setBalanceInput(e.target.value)}
                                placeholder="0.00"
                                required
                                autoFocus
                            />
                            <p className="text-xs text-muted mt-2">
                                {isOpen
                                    ? 'Ingrese el monto total de dinero físico actualmente en la caja.'
                                    : 'Ingrese el cambio inicial o monto base con el que abre la caja hoy.'}
                            </p>
                            {isOpen && cashShift?.expected_balance !== undefined && (
                                <div className="mt-4 p-3 bg-surface-secondary/40 rounded-lg border border-border">
                                    <p className="text-sm font-semibold text-foreground mb-2">Cálculo del Sistema</p>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted">Apertura:</span>
                                            <span className="font-medium text-foreground">{formatCurrency(cashShift.opening_balance)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted">Ingresos (Turno):</span>
                                            <span className="font-medium text-foreground">{formatCurrency(cashShift.total_incomes || 0)}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between font-bold mt-2 pt-2 border-t border-border">
                                        <span className="text-foreground">Total Esperado:</span>
                                        <span className="text-emerald-600">{formatCurrency(cashShift.expected_balance)}</span>
                                    </div>
                                </div>
                            )}

                            {isOpen && cashShift?.expected_balance !== undefined && Math.abs(parseFloat(balanceInput || "0") - cashShift.expected_balance) > 0.01 && balanceInput && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-2">
                                        <AlertCircle className="w-4 h-4" /> Descuadre Detectado
                                    </p>
                                    <p className="text-xs text-red-700 mb-3">El monto físico difiere del sistema. Justifique el descuadre obligatoriamente.</p>
                                    <textarea
                                        value={justification}
                                        onChange={(e) => setJustification(e.target.value)}
                                        placeholder="Ingrese el motivo del descuadre (ej. Gasto menor, error en vuelto)..."
                                        className="flex min-h-[80px] w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-foreground overflow-auto"
                                    />
                                    {isOpen && cashShift?.expected_balance !== undefined && Math.abs(parseFloat(balanceInput || "0") - cashShift.expected_balance) > 0.01 && (!justification || justification.length < 10) && (
                                        <span className="text-red-500 text-sm mt-1 block">Completa este campo (min. 10 caracteres).</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isPending}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant={isOpen ? "danger" : "primary"} disabled={isPending || !balanceInput}>
                                {isPending ? <Spinner size="sm" /> : (isOpen ? 'Confirmar Cierre' : 'Confirmar Apertura')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <CashShiftHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />
        </>
    );
}
