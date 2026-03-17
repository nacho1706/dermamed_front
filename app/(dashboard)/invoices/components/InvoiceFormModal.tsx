import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import {
  getVoucherTypes,
  getPaymentMethods,
  createInvoice,
  updateInvoice,
} from "@/services/invoices";
import { getProducts } from "@/services/products";
import { getServices } from "@/services/services";
import { getDoctors } from "@/services/doctors";
import { getCurrentCashShift } from "@/services/cash-shifts";
import type { Patient, Invoice } from "@/types";

// Import extracted components and schemas
import { InvoicePatientInfo } from "./invoice-patient-info";
import { InvoiceItemsManager } from "./invoice-items-manager";
import { InvoicePaymentMethods } from "./invoice-payment-methods";
import { invoiceSchema, type InvoiceFormValues } from "./invoice-schema";

export function InvoiceFormModal({
  isOpen,
  onClose,
  invoice,
  appointmentId,
  preloadedPatient,
  preloadedService,
  preloadedDoctorId,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice;
  /** ID del turno a vincular en la nueva factura (viene del botón $ del dashboard) */
  appointmentId?: number;
  /** Paciente pre-cargado desde el turno */
  preloadedPatient?: Patient | null;
  /** Servicio del turno para pre-rellenar el ítem */
  preloadedService?: { id: number; name: string; price: number } | null;
  /** ID del médico del turno para pre-rellenar el ítem */
  preloadedDoctorId?: number | null;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Data Sources
  const { data: cashShift } = useQuery({
    queryKey: ["currentCashShift"],
    queryFn: getCurrentCashShift,
    enabled: isOpen,
  });

  const { data: voucherTypes } = useQuery({
    queryKey: ["voucher-types"],
    queryFn: getVoucherTypes,
    enabled: isOpen,
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: getPaymentMethods,
    enabled: isOpen,
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => getDoctors({ role: "doctor" }),
    enabled: isOpen,
  });
  const doctors = (doctorsData?.data || []).filter(
    (user) =>
      user.roles?.some((r) => r.name === "doctor") ||
      (user as any).role?.slug === "doctor" ||
      (user as any).role === "doctor",
  );

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => getProducts({ cantidad: 100 } as any),
    enabled: isOpen,
  });
  const products = productsData?.data || [];

  const { data: servicesData, isLoading: isLoadingServices } = useQuery({
    queryKey: ["services", "all"],
    queryFn: () => getServices({ cantidad: 100 }),
    enabled: isOpen,
  });
  const services = servicesData?.data || [];

  const isDataReady = isOpen && !isLoadingProducts && !isLoadingServices;

  // Local State for Patient (shared with InvoicePatientInfo)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Form Setup using React Hook Form
  const methods = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      patient_id: 0,
      voucher_type_id: 0,
      items: [
        {
          type: "service",
          description: "",
          quantity: 1,
          unit_price: 0,
          product_id: null,
          service_id: null,
          executor_doctor_id: null,
        } as any,
      ],
      payments: [],
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (!isDataReady) return;
    if (isOpen) {
      if (invoice) {
        if (invoice.patient) {
          setSelectedPatient(invoice.patient);
        }

        methods.reset({
          patient_id: invoice.patient?.id || 0,
          voucher_type_id: invoice.voucher_type?.id || 0,
          items:
            (invoice.items?.map((item) => ({
              type: item.product_id ? "product" : "service",
              description: item.description,
              quantity: Number(item.quantity) || 1,
              unit_price: Number(item.unit_price) || 0,
              product_id: item.product_id ? item.product_id.toString() : "",
              service_id: item.service_id ? item.service_id.toString() : "",
              executor_doctor_id: item.executor_doctor_id
                ? item.executor_doctor_id.toString()
                : "",
            })) as any) || [],
          payments:
            invoice.payments?.map((payment) => ({
              payment_method_id: payment.payment_method?.id || 1,
              amount: Number(payment.amount),
            })) || [],
        });
      } else {
        // Pre-cargar el paciente si viene del botón $ del dashboard
        if (preloadedPatient) {
          setSelectedPatient(preloadedPatient);
          methods.reset({
            patient_id: preloadedPatient.id,
            voucher_type_id: 0,
            items: [
              {
                type: "service",
                service_id: preloadedService?.id ?? null,
                description: preloadedService?.name ?? "",
                unit_price: preloadedService?.price ?? 0,
                quantity: 1,
                product_id: null,
                executor_doctor_id: preloadedDoctorId ?? null,
              } as any,
            ],
            payments: [],
          });
        } else {
          methods.reset({
            patient_id: 0,
            voucher_type_id: 0,
            items: [
              {
                type: "service",
                description: "",
                quantity: 1,
                unit_price: 0,
                product_id: null,
                service_id: null,
                executor_doctor_id: null,
              } as any,
            ],
            payments: [],
          });
          setSelectedPatient(null);
        }
      }
    }
  }, [isOpen, isDataReady, invoice, preloadedPatient, preloadedService, preloadedDoctorId, methods]);

  // Compute Derived State
  const watchedItems = methods.watch("items");
  const subtotal =
    watchedItems?.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
      0,
    ) || 0;

  const payments = methods.watch("payments");
  const totalPaid =
    payments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) ||
    0;

  // Submit Mutations
  const createMut = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["currentCashShift"] });
      // Invalida appointments para que el botón $ del dashboard refleje
      // el nuevo estado de la factura (paid) sin necesitar F5.
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Factura creada correctamente");
      onClose();
      router.refresh();
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Error al crear la factura";
      toast.error(message);
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: { id: number; payload: Partial<Invoice> }) =>
      updateInvoice(data.id, data.payload),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["currentCashShift"] });
      toast.success("Factura actualizada correctamente");
      onClose();
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Error al actualizar la factura";
      toast.error(message);
    },
  });

  const onSubmit = (data: InvoiceFormValues) => {
    if (!cashShift && !invoice) {
      toast.error("Debe abrir la caja diaria primero");
      return;
    }

    const payload = {
      patient_id: data.patient_id,
      voucher_type_id: data.voucher_type_id,
      total: subtotal,
      // Vincular el turno si viene del botón $ del dashboard
      ...(appointmentId && !invoice ? { appointment_id: appointmentId } : {}),
      items: data.items.map((i) => ({
        product_id: i.product_id ? parseInt(i.product_id as any) : undefined,
        service_id: i.service_id ? parseInt(i.service_id as any) : undefined,
        executor_doctor_id: i.executor_doctor_id
          ? parseInt(i.executor_doctor_id as any)
          : undefined,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.quantity * i.unit_price,
      })),
      payments: data.payments?.map((p) => {
        const isCash = paymentMethods
          ?.find((m) => m.id === p.payment_method_id)
          ?.name?.toLowerCase()
          .includes("efectivo");
        const amountToSend = isCash ? Math.min(p.amount, subtotal) : p.amount;

        return {
          payment_method_id: p.payment_method_id,
          amount: amountToSend,
        };
      }),
    };

    if (invoice) {
      updateMut.mutate({
        id: invoice.id,
        payload: payload as Partial<Invoice>,
      });
    } else {
      createMut.mutate(payload as Partial<Invoice>);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const isCashShiftClosed = !cashShift && !invoice;

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice ? "Editar Factura" : "Nueva Factura"}
          </DialogTitle>
          <DialogDescription className="hidden">
            Cree o edite una factura para pacientes.
          </DialogDescription>
        </DialogHeader>

        {isCashShiftClosed && (
          <div className="bg-danger/10 border border-danger/20 text-danger rounded-md p-4 flex items-start gap-3 mt-2">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Caja Diaria Cerrada</p>
              <p className="text-xs mt-1 opacity-90">
                Atención: Debes abrir la Caja Diaria en el panel principal antes
                de poder registrar comprobantes y cobros.
              </p>
            </div>
          </div>
        )}

        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="space-y-6 mt-2"
          >
            <fieldset disabled={isCashShiftClosed || isPending}>
              <InvoicePatientInfo
                voucherTypes={voucherTypes || []}
                selectedPatient={selectedPatient}
                setSelectedPatient={setSelectedPatient}
              />

              <InvoiceItemsManager
                products={products}
                services={services}
                doctors={doctors}
              />

              {!invoice && (
                <InvoicePaymentMethods
                  paymentMethods={paymentMethods || []}
                  subtotal={subtotal}
                  totalPaid={totalPaid}
                />
              )}

              {/* Totals & Submit */}
              <div className="flex flex-col items-end pt-6 border-t gap-1 mt-6">
                <div className="text-right w-full sm:w-64">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted">Subtotal:</span>
                    <span className="font-semibold">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2 pb-2 border-b">
                    <span className="text-muted">Pagos Recibidos:</span>
                    <span className="text-success font-semibold">
                      {formatCurrency(totalPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg items-center">
                    <span className="text-muted">Total a Pagar:</span>
                    <span
                      className={`font-bold ${subtotal - totalPaid > 0 ? "text-warning" : "text-success"}`}
                    >
                      {formatCurrency(
                        subtotal - totalPaid > 0 ? subtotal - totalPaid : 0,
                      )}
                    </span>
                  </div>
                  {totalPaid > subtotal && (
                    <div className="flex justify-between text-lg items-center mt-2 p-2 bg-success/10 border border-success/20 rounded-lg">
                      <span className="text-success font-bold">
                        Vuelto a entregar:
                      </span>
                      <span className="font-extrabold text-success">
                        {formatCurrency(totalPaid - subtotal)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || isCashShiftClosed}
                  >
                    {isPending ? <Spinner size="sm" /> : "Registrar Factura"}
                  </Button>
                </div>
              </div>
            </fieldset>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
