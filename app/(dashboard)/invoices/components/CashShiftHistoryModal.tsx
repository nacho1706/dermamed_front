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
import { History, Wallet, Download, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

function formatCurrency(value: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
    }).format(value || 0);
}

const exportToCsv = (shifts: any[]) => {
    const headers = [
        "Apertura",
        "Cierre",
        "Usuario",
        "Inicial",
        "Ingresos Efvo.",
        "Egresos Efvo.",
        "Cierre Real",
    ];

    const rows = shifts.map((shift: any) => [
        formatLocalDateTime(shift.opening_time),
        shift.closing_time ? formatLocalDateTime(shift.closing_time) : "En Curso",
        shift.opened_by ? `${shift.opened_by.first_name || shift.opened_by.name} ${shift.opened_by.last_name || ""}`.trim() : "Usuario",
        shift.opening_balance || 0,
        shift.total_incomes || 0,
        shift.total_expenses || 0,
        shift.closing_balance || "No cerrado",
    ]);

    const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historial_cajas_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export function CashShiftHistoryModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const { data, isLoading } = useQuery({
        queryKey: ["cashShiftsHistory"],
        queryFn: () => getCashShifts(),
        enabled: isOpen,
    });

    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

    const toggleRow = (id: number) => {
        setExpandedRows((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const shifts = data?.data || [];

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
                <DialogHeader>
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <DialogTitle className="flex items-center gap-2">
                                <History className="w-5 h-5 text-muted-foreground" />
                                Historial de Cajas Diarias
                            </DialogTitle>
                            <DialogDescription>
                                Visualice el histórico de aperturas, cierres, ingresos y egresos de caja.
                            </DialogDescription>
                        </div>
                        {shifts.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportToCsv(shifts)}
                                className="shrink-0 flex items-center"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar
                            </Button>
                        )}
                    </div>
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
                        <div className="border border-border rounded-md overflow-hidden bg-surface">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-secondary/50 border-b border-border">
                                    <tr>
                                        <th className="px-3 py-3 w-10"></th>
                                        <th className="px-4 py-3 text-left font-medium text-muted">Apertura</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted">Cierre</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted">Usuario</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted">Inicial</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted whitespace-nowrap">Ingresos (Efvo.)</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted whitespace-nowrap">Egresos (Efvo.)</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted">Cierre Real</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {shifts.map((shift: any) => (
                                        <React.Fragment key={shift.id}>
                                            <tr
                                                className={`hover:bg-surface-secondary/20 transition-colors cursor-pointer ${expandedRows[shift.id] ? "bg-surface-secondary/10" : ""}`}
                                                onClick={() => toggleRow(shift.id)}
                                            >
                                                <td className="px-3 py-3 text-center text-muted">
                                                    {expandedRows[shift.id] ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {formatLocalDateTime(shift.opening_time)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {shift.closing_time ? formatLocalDateTime(shift.closing_time) : (
                                                        <span className="text-emerald-600 font-medium text-[10px] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">En Curso</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 truncate max-w-[120px]">
                                                    {shift.opened_by ? `${shift.opened_by.first_name || shift.opened_by.name} ${shift.opened_by.last_name || ''}`.trim() : 'Usuario'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium font-mono text-xs whitespace-nowrap">
                                                    {formatCurrency(shift.opening_balance)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-emerald-600 font-mono text-xs whitespace-nowrap">
                                                    {formatCurrency(shift.total_incomes)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-red-600 font-mono text-xs whitespace-nowrap">
                                                    {(shift.total_expenses ?? 0) > 0
                                                        ? `-${formatCurrency(shift.total_expenses)}`
                                                        : <span className="text-muted">—</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-blue-600 font-mono text-xs whitespace-nowrap">
                                                    {shift.closing_balance ? formatCurrency(shift.closing_balance) : '—'}
                                                </td>
                                            </tr>
                                            {expandedRows[shift.id] && (
                                                <tr className="bg-surface-secondary/5">
                                                    <td colSpan={8} className="p-0 border-t border-border">
                                                        <div className="p-4 border-l-4 border-l-brand-500 shadow-inner space-y-4">
                                                            {/* Metadata */}
                                                            <div className="flex flex-col gap-2">
                                                                <p className="text-sm font-medium text-muted">
                                                                    Cerrado por: <span className="text-foreground">{shift.closed_by_name || 'Desconocido'}</span>
                                                                </p>
                                                                {shift.justification && (
                                                                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                                                                        <span className="font-bold flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4" /> Justificación de descuadre:</span>
                                                                        {shift.justification}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Detalle de Cobros */}
                                                            <div>
                                                                <div className="flex items-center justify-between mb-3 pt-2 border-t border-border/50">
                                                                    <h4 className="font-semibold text-sm text-emerald-700">💵 Detalle de Cobros (Efectivo)</h4>
                                                                </div>
                                                                {!shift.payments || shift.payments.length === 0 ? (
                                                                    <p className="text-sm text-muted italic">No hay cobros registrados en esta caja.</p>
                                                                ) : (
                                                                    <div className="bg-surface rounded-md border border-border overflow-hidden">
                                                                        <table className="w-full text-xs">
                                                                            <thead className="bg-surface-secondary">
                                                                                <tr>
                                                                                    <th className="px-3 py-2 text-left font-medium text-muted">Hora</th>
                                                                                    <th className="px-3 py-2 text-left font-medium text-muted">Factura #</th>
                                                                                    <th className="px-3 py-2 text-left font-medium text-muted">Método</th>
                                                                                    <th className="px-3 py-2 text-right font-medium text-muted">Monto</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-border">
                                                                                {shift.payments.map((payment: any) => (
                                                                                    <tr key={payment.id} className="hover:bg-surface-secondary/20">
                                                                                        <td className="px-3 py-2 whitespace-nowrap">{formatLocalDateTime(payment.payment_date || payment.created_at)}</td>
                                                                                        <td className="px-3 py-2">
                                                                                            {payment.invoice ? `FAC-${payment.invoice.id}` : '—'}
                                                                                        </td>
                                                                                        <td className="px-3 py-2">{payment.payment_method?.name || 'Local'}</td>
                                                                                        <td className="px-3 py-2 text-right font-medium font-mono text-emerald-700">{formatCurrency(payment.amount)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Detalle de Egresos */}
                                                            <div>
                                                                <div className="flex items-center justify-between mb-3 pt-2 border-t border-border/50">
                                                                    <h4 className="font-semibold text-sm text-red-600">📤 Detalle de Egresos</h4>
                                                                    {(shift.total_expenses ?? 0) > 0 && (
                                                                        <span className="text-xs font-mono font-semibold text-red-600">
                                                                            Total: -{formatCurrency(shift.total_expenses)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {!shift.expenses || shift.expenses.length === 0 ? (
                                                                    <p className="text-sm text-muted italic">No hay egresos registrados en esta caja.</p>
                                                                ) : (
                                                                    <div className="bg-surface rounded-md border border-red-100 overflow-hidden">
                                                                        <table className="w-full text-xs">
                                                                            <thead className="bg-red-50/60">
                                                                                <tr>
                                                                                    <th className="px-3 py-2 text-left font-medium text-muted">Hora</th>
                                                                                    <th className="px-3 py-2 text-left font-medium text-muted">Concepto</th>
                                                                                    <th className="px-3 py-2 text-right font-medium text-muted">Monto</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-red-100">
                                                                                {shift.expenses.map((expense: any) => (
                                                                                    <tr key={expense.id} className="hover:bg-red-50/30">
                                                                                        <td className="px-3 py-2 whitespace-nowrap text-muted">{formatLocalDateTime(expense.created_at)}</td>
                                                                                        <td className="px-3 py-2 text-slate-700 font-medium">{expense.description}</td>
                                                                                        <td className="px-3 py-2 text-right font-medium font-mono text-red-600 whitespace-nowrap">
                                                                                            -{formatCurrency(expense.amount)}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
