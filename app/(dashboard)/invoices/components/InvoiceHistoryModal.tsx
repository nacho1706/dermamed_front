import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getInvoiceHistory } from "@/services/invoices";
import { formatLocalDateTime } from "@/lib/timezone";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { History } from "lucide-react";

export function InvoiceHistoryModal({
    isOpen,
    onClose,
    invoiceId,
}: {
    isOpen: boolean;
    onClose: () => void;
    invoiceId?: number;
}) {
    const { data: history, isLoading } = useQuery({
        queryKey: ["invoiceHistory", invoiceId],
        queryFn: () => getInvoiceHistory(invoiceId!),
        enabled: isOpen && !!invoiceId,
    });

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-muted-foreground" />
                        Historial de la Factura #{invoiceId}
                    </DialogTitle>
                    <DialogDescription>
                        Auditoría de acciones realizadas sobre esta factura.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Spinner />
                        </div>
                    ) : !history || history.length === 0 ? (
                        <p className="text-center text-muted p-8">No hay historial registrado.</p>
                    ) : (
                        <div className="relative border-l border-border pl-4 ml-2 space-y-6">
                            {history.map((log: any) => (
                                <div key={log.id} className="relative">
                                    <span className="absolute -left-[21px] flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 ring-4 ring-background" />
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-medium leading-none text-foreground">
                                            {log.action}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {log.description}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[11px] text-muted font-medium">
                                                {log.user ? (log.user.name || `${log.user.first_name || ''} ${log.user.last_name || ''}`).trim() : 'Sistema'}
                                            </span>
                                            <span className="text-muted-foreground">•</span>
                                            <span className="text-[11px] text-muted-foreground">
                                                {formatLocalDateTime(log.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
