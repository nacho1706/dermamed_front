import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCashShifts } from "@/services/cash-shifts";
import { formatLocalDateTime } from "@/lib/timezone";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { History, Wallet } from "lucide-react";

function formatCurrency(value: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
    }).format(value || 0);
}

export function CashShiftHistoryModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ["cashShiftsHistory", page],
        queryFn: () => getCashShifts({ pagina: page }),
        enabled: isOpen,
    });

    const shifts = data?.data || [];
    const totalPages = data?.meta?.last_page || 1;

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-muted-foreground" />
                        Historial de Cajas Diarias
                    </DialogTitle>
                    <DialogDescription>
                        Visualice el histórico de aperturas y cierres de caja.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <Spinner />
                        </div>
                    ) : shifts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-muted text-center bg-surface-secondary/20 rounded-lg border border-dashed border-border">
                            <Wallet className="w-10 h-10 mb-3 opacity-20" />
                            <p>No hay un historial de cajas registradas.</p>
                        </div>
                    ) : (
                        <div className="border border-border rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-secondary/50 border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-muted">Apertura</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted">Cierre</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted">Usuario</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted">Inicial</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted">Ingresos (Efvo.)</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted">Cierre Real</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-surface">
                                    {shifts.map((shift: any) => (
                                        <tr key={shift.id} className="hover:bg-surface-secondary/20">
                                            <td className="px-4 py-3">
                                                {formatLocalDateTime(shift.opening_time)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {shift.closing_time ? formatLocalDateTime(shift.closing_time) : (
                                                    <span className="text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">En Curso</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {shift.opened_by ? `${shift.opened_by.first_name || shift.opened_by.name} ${shift.opened_by.last_name || ''}`.trim() : 'Usuario'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                {formatCurrency(shift.opening_balance)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                                {formatCurrency(shift.total_incomes)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-blue-600">
                                                {shift.closing_balance ? formatCurrency(shift.closing_balance) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between p-4 border-t border-border bg-surface-secondary/30">
                                    <p className="text-xs text-muted">
                                        Página {page} de {totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
