import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, AlertCircle } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    getVoucherTypes,
    getPaymentMethods,
    createInvoice,
    updateInvoice,
} from "@/services/invoices";
import { getPatients } from "@/services/patients";
import { getProducts } from "@/services/products";
import { getServices } from "@/services/services";
import { getDoctors } from "@/services/doctors";
import { useDebounce } from "@/hooks/use-debounce";
import { getCurrentCashShift } from "@/services/cash-shifts";
import type { Patient, Product, Service, User, Invoice } from "@/types";

// --- Schema Definitions ---

const itemSchema = z
    .object({
        type: z.enum(["product", "service"]),
        product_id: z.coerce.number().optional().nullable(),
        service_id: z.coerce.number().optional().nullable(),
        executor_doctor_id: z.coerce.number().optional().nullable(),
        description: z.string().min(1, "Descripción requerida"),
        quantity: z.coerce.number().min(1, "Al menos 1"),
        unit_price: z.coerce.number().min(0, "Monto inválido"),
    })
    .superRefine((data, ctx) => {
        if (data.type === "product" && !data.product_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Seleccione un producto",
                path: ["product_id"],
            });
        }
        if (data.type === "service") {
            if (!data.service_id) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Seleccione un servicio",
                    path: ["service_id"],
                });
            }
            if (!data.executor_doctor_id) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Seleccione un médico",
                    path: ["executor_doctor_id"],
                });
            }
        }
    });

const paymentSchema = z.object({
    payment_method_id: z.coerce.number().min(1, "Método de pago requerido"),
    amount: z.coerce.number().min(0.01, "Monto inválido"),
});

const invoiceSchema = z.object({
    patient_id: z.coerce.number().min(1, "Seleccione un paciente"),
    voucher_type_id: z.coerce.number().min(1, "Comprobante requerido"),
    items: z.array(itemSchema).min(1, "Agregue al menos un item"),
    payments: z.array(paymentSchema).optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

// --- Helper Formatting ---

function formatCurrency(value: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
    }).format(value);
}

// --- Component ---

export function InvoiceFormModal({
    isOpen,
    onClose,
    invoice,
}: {
    isOpen: boolean;
    onClose: () => void;
    invoice?: Invoice;
}) {
    const queryClient = useQueryClient();
    const router = useRouter();

    // Queries (Data Sources)
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
        queryFn: () => getDoctors({ role: 'doctor' }), // Returns PaginatedResponse<User>
        enabled: isOpen,
    });
    const doctors = (doctorsData?.data || []).filter(user =>
        user.roles?.some(r => r.name === 'doctor') ||
        (user as any).role?.slug === 'doctor' ||
        (user as any).role === 'doctor'
    );

    // Patient Search State inside Modal (Custom AutoComplete logic vs simple input + dropdown due to missing shadcn Command/Combobox that integrates directly easily without writing custom components)
    const [patientSearch, setPatientSearch] = useState("");
    const debouncedPatientSearch = useDebounce(patientSearch, 300);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    const { data: patientsData } = useQuery({
        queryKey: ["patients", "search", debouncedPatientSearch],
        queryFn: () =>
            getPatients({
                first_name: debouncedPatientSearch || undefined, // or map to 'search' parameter, depending on backend. We used first_name in previous page
                cantidad: 5,
            }),
        enabled:
            isOpen && (debouncedPatientSearch.length > 0 || showPatientDropdown),
    });

    // Services and Products loading (Fetch all or paginated? In typical selects we fetch a chunk)
    const { data: productsData } = useQuery({
        queryKey: ["products", "all"],
        queryFn: () => getProducts({ cantidad: 100 } as any),
        enabled: isOpen,
    });
    const products = productsData?.data || [];

    const { data: servicesData } = useQuery({
        queryKey: ["services", "all"],
        queryFn: () => getServices({ cantidad: 100 }),
        enabled: isOpen,
    });
    const services = servicesData?.data || [];

    // Form Setup
    const form = useForm<InvoiceFormValues>({
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
                    product_id: "",
                    service_id: "",
                    executor_doctor_id: "",
                } as any,
            ],
            payments: [],
        },
    });

    // Field Arrays
    const {
        fields: itemFields,
        append: appendItem,
        remove: removeItem,
    } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const {
        fields: paymentFields,
        append: appendPayment,
        remove: removePayment,
    } = useFieldArray({
        control: form.control,
        name: "payments",
    });

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (invoice) {
                // Determine patient details directly from the invoice object
                if (invoice.patient) {
                    setSelectedPatient(invoice.patient);
                    setPatientSearch(`${invoice.patient.first_name} ${invoice.patient.last_name}`);
                }

                form.reset({
                    patient_id: invoice.patient?.id || 0,
                    voucher_type_id: invoice.voucher_type?.id || 0,
                    items: invoice.items?.map((item) => ({
                        type: item.product_id ? "product" : "service",
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: Number(item.unit_price),
                        product_id: item.product_id,
                        service_id: item.service_id,
                        executor_doctor_id: item.executor_doctor_id,
                    })) as any || [],
                    payments: invoice.payments?.map((payment) => ({
                        payment_method_id: payment.payment_method?.id || 1, // Fallback safely
                        amount: Number(payment.amount),
                    })) || [],
                });
            } else {
                form.reset({
                    patient_id: 0,
                    voucher_type_id: 0,
                    items: [
                        {
                            type: "service",
                            description: "",
                            quantity: 1,
                            unit_price: 0,
                            product_id: "",
                            service_id: "",
                            executor_doctor_id: "",
                        } as any,
                    ],
                    payments: [],
                });
                setPatientSearch("");
                setSelectedPatient(null);
            }
            setShowPatientDropdown(false);
        }
    }, [isOpen, invoice, form]);

    // Compute Subtotal Dynamically
    const items = form.watch("items");
    const subtotal = items.reduce(
        (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
        0
    );

    const payments = form.watch("payments");
    const totalPaid = payments?.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
    ) || 0;

    // Change handlers for Items dropdowns
    const handleTypeChange = (index: number, type: "product" | "service") => {
        form.setValue(`items.${index}.type`, type);
        form.setValue(`items.${index}.description`, "");
        form.setValue(`items.${index}.unit_price`, 0);
        form.setValue(`items.${index}.product_id`, "" as any);
        form.setValue(`items.${index}.service_id`, "" as any);
        form.setValue(`items.${index}.executor_doctor_id`, "" as any);
    };

    const handleProductSelect = (index: number, productId: number) => {
        const product = products.find((p) => p.id === productId);
        if (product) {
            form.setValue(`items.${index}.product_id`, product.id);
            form.setValue(`items.${index}.description`, product.name);
            form.setValue(`items.${index}.unit_price`, product.price);
        }
    };

    const handleServiceSelect = (index: number, serviceId: number) => {
        const service = services.find((s) => s.id === serviceId);
        if (service) {
            form.setValue(`items.${index}.service_id`, service.id);
            form.setValue(`items.${index}.description`, service.name);
            form.setValue(`items.${index}.unit_price`, service.price);
        }
    };

    // Submit Mutation
    const createMut = useMutation({
        mutationFn: createInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            toast.success("Factura creada correctamente");
            onClose();
            router.refresh();
        },
        onError: (error: any) => {
            // Show backend error if available
            const message =
                error.response?.data?.message || "Error al crear la factura";
            toast.error(message);
        },
    });

    const updateMut = useMutation({
        mutationFn: (data: { id: number; payload: Partial<Invoice> }) => updateInvoice(data.id, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            toast.success("Factura actualizada correctamente");
            onClose();
            router.refresh();
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
            items: data.items.map((i) => ({
                product_id: i.product_id || undefined,
                service_id: i.service_id || undefined,
                executor_doctor_id: i.executor_doctor_id || undefined,
                description: i.description,
                quantity: i.quantity,
                unit_price: i.unit_price,
                subtotal: i.quantity * i.unit_price, // Backend checks this
            })),
            payments: data.payments?.map((p) => ({
                payment_method_id: p.payment_method_id,
                amount: p.amount,
            })),
        };

        if (invoice) {
            updateMut.mutate({ id: invoice.id, payload: payload as Partial<Invoice> });
        } else {
            createMut.mutate(payload as Partial<Invoice>);
        }
    };

    const isPending = createMut.isPending || updateMut.isPending;
    const isCashShiftClosed = !cashShift && !invoice;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{invoice ? "Editar Factura" : "Nueva Factura"}</DialogTitle>
                    <DialogDescription className="hidden">Cree o edite una factura para pacientes.</DialogDescription>
                </DialogHeader>

                {isCashShiftClosed && (
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 flex items-start gap-3 mt-2">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold">Caja Diaria Cerrada</p>
                            <p className="text-xs mt-1 text-red-700">
                                Atención: Debes abrir la Caja Diaria en el panel principal antes
                                de poder registrar comprobantes y cobros.
                            </p>
                        </div>
                    </div>
                )}

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6 mt-2"
                    >
                        <fieldset disabled={isCashShiftClosed || isPending}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                                {/* Custom Patient Search Selector */}
                                <div className="relative z-20 space-y-2">
                                    <FormLabel>Paciente *</FormLabel>
                                    {selectedPatient ? (
                                        <div className="flex items-center justify-between px-3 py-2 bg-brand-50 border border-brand-200 rounded-[var(--radius-md)]">
                                            <span className="text-sm font-medium text-brand-800 truncate line-clamp-1">
                                                {selectedPatient.first_name} {selectedPatient.last_name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedPatient(null);
                                                    setPatientSearch("");
                                                    form.setValue("patient_id", 0);
                                                }}
                                                className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2"
                                            >
                                                Cambiar
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Input
                                                placeholder="Buscar paciente..."
                                                value={patientSearch}
                                                onChange={(e) => {
                                                    setPatientSearch(e.target.value);
                                                    setShowPatientDropdown(true);
                                                }}
                                                onFocus={() => setShowPatientDropdown(true)}
                                                className={
                                                    form.formState.errors.patient_id
                                                        ? "border-red-500"
                                                        : ""
                                                }
                                            />
                                            {showPatientDropdown &&
                                                patientsData &&
                                                patientsData.data.length > 0 && (
                                                    <div className="absolute top-[80px] left-0 right-0 mt-1 bg-surface border border-border rounded-[var(--radius-md)] shadow-lg max-h-60 overflow-y-auto z-50">
                                                        {patientsData.data.map((p) => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onMouseDown={(e) => {
                                                                    // Prevents input blur from closing dropdown before click
                                                                    e.preventDefault();
                                                                }}
                                                                onClick={() => {
                                                                    setSelectedPatient(p);
                                                                    form.setValue("patient_id", p.id);
                                                                    setShowPatientDropdown(false);
                                                                    form.clearErrors("patient_id");
                                                                }}
                                                                className="w-full text-left px-4 py-2 hover:bg-surface-secondary text-sm"
                                                            >
                                                                <p className="font-medium truncate">
                                                                    {p.first_name} {p.last_name}
                                                                </p>
                                                                {p.cuit && (
                                                                    <p className="text-xs text-muted truncate">
                                                                        DNI/CUIT: {p.cuit}
                                                                    </p>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                        </>
                                    )}
                                    {form.formState.errors.patient_id && (
                                        <p className="text-[0.8rem] font-medium text-red-500">
                                            {form.formState.errors.patient_id.message}
                                        </p>
                                    )}
                                </div>

                                <FormField
                                    control={form.control}
                                    name="voucher_type_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Comprobante *</FormLabel>
                                            <Select
                                                onValueChange={(val) => field.onChange(parseInt(val))}
                                                value={field.value > 0 ? field.value.toString() : ""}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {voucherTypes?.map((vt) => (
                                                        <SelectItem key={vt.id} value={vt.id.toString()}>
                                                            {vt.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Items Array */}
                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-foreground">
                                        Items de Facturación
                                    </h3>
                                </div>

                                {itemFields.map((field, index) => {
                                    const type = form.watch(`items.${index}.type`);
                                    return (
                                        <div
                                            key={field.id}
                                            className="bg-surface-secondary/20 border border-border/50 p-4 rounded-lg space-y-4 relative"
                                        >
                                            <div className="absolute top-2 right-2">
                                                {itemFields.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeItem(index)}
                                                        className="text-muted hover:text-danger p-2 h-auto"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-6">
                                                {/* Type Switcher */}
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.type`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Tipo</FormLabel>
                                                            <Select
                                                                onValueChange={(val) => {
                                                                    field.onChange(val);
                                                                    handleTypeChange(
                                                                        index,
                                                                        val as "product" | "service",
                                                                    );
                                                                }}
                                                                value={field.value}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Tipo" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="service">
                                                                        Servicio
                                                                    </SelectItem>
                                                                    <SelectItem value="product">
                                                                        Producto
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                {/* Search Combobox / Selector */}
                                                <div className="md:col-span-2 space-y-2">
                                                    <FormLabel>Elemento</FormLabel>
                                                    {type === "product" ? (
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.product_id`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <Select
                                                                        onValueChange={(val) =>
                                                                            handleProductSelect(index, parseInt(val))
                                                                        }
                                                                        value={
                                                                            field.value
                                                                                ? field.value.toString()
                                                                                : undefined
                                                                        }
                                                                    >
                                                                        <FormControl>
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder="Seleccionar producto..." />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            {products.map((p) => (
                                                                                <SelectItem
                                                                                    key={p.id}
                                                                                    value={p.id.toString()}
                                                                                >
                                                                                    {p.name} (Stock: {p.stock})
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    ) : (
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.service_id`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <Select
                                                                        onValueChange={(val) =>
                                                                            handleServiceSelect(index, parseInt(val))
                                                                        }
                                                                        value={
                                                                            field.value
                                                                                ? field.value.toString()
                                                                                : undefined
                                                                        }
                                                                    >
                                                                        <FormControl>
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder="Seleccionar servicio..." />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            {services.map((s) => (
                                                                                <SelectItem
                                                                                    key={s.id}
                                                                                    value={s.id.toString()}
                                                                                >
                                                                                    {s.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    )}
                                                </div>

                                                {/* Executor Doctor (Only for Services) */}
                                                {type === "service" && (
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.executor_doctor_id`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Médico *</FormLabel>
                                                                <Select
                                                                    onValueChange={(val) =>
                                                                        field.onChange(parseInt(val))
                                                                    }
                                                                    value={
                                                                        field.value
                                                                            ? field.value.toString()
                                                                            : undefined
                                                                    }
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Médico ejecutor..." />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {doctors.map((user) => (
                                                                            <SelectItem
                                                                                key={user.id}
                                                                                value={user.id.toString()}
                                                                            >
                                                                                {user.first_name || user.name}{" "}
                                                                                {user.last_name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}

                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.description`}
                                                    render={({ field }) => (
                                                        <FormItem className={type === "service" ? "md:col-span-4" : "md:col-span-1"}>
                                                            <FormLabel>Descripción Custom</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} placeholder="Descripción extra..." />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                {/* Quantity and Price */}
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.quantity`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Cant.</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" min="1" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.unit_price`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Precio Unit. ($)</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                {/* Display Local Subtotal */}
                                                <div className="flex flex-col justify-end">
                                                    <FormLabel className="invisible">Total</FormLabel>
                                                    <div className="h-10 flex items-center font-bold">
                                                        {formatCurrency((form.watch(`items.${index}.quantity`) || 0) * (form.watch(`items.${index}.unit_price`) || 0))}
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    );
                                })}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        appendItem({
                                            type: "service",
                                            description: "",
                                            quantity: 1,
                                            unit_price: 0,
                                            product_id: "",
                                            service_id: "",
                                            executor_doctor_id: "",
                                        } as any)
                                    }
                                    className="w-full border-dashed"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Agregar Item
                                </Button>
                                {form.formState.errors.items?.root && (
                                    <p className="text-sm font-medium text-red-500 text-center">
                                        {form.formState.errors.items.root.message}
                                    </p>
                                )}
                            </div>

                            {/* Payments Array */}
                            <div className="space-y-4 pt-6 border-t">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-foreground">
                                        Pagos Recibidos (Opcional)
                                    </h3>
                                </div>

                                {paymentFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-4 items-end bg-surface-secondary/10 p-3 rounded-lg">
                                        <div className="flex-1">
                                            <FormField
                                                control={form.control}
                                                name={`payments.${index}.payment_method_id`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Método de Pago</FormLabel>
                                                        <Select
                                                            onValueChange={(val) =>
                                                                field.onChange(parseInt(val))
                                                            }
                                                            value={
                                                                field.value ? field.value.toString() : undefined
                                                            }
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Seleccionar..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {paymentMethods?.map((pm) => (
                                                                    <SelectItem
                                                                        key={pm.id}
                                                                        value={pm.id.toString()}
                                                                    >
                                                                        {pm.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <FormField
                                                control={form.control}
                                                name={`payments.${index}.amount`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Monto</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min="0.01"
                                                                step="0.01"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => removePayment(index)}
                                            className="text-muted hover:text-danger mb-1"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                ))}

                                {paymentFields.length === 0 && (
                                    <p className="text-sm text-muted italic">Sin pagos iniciales. Se registrará como pendiente.</p>
                                )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        appendPayment({
                                            payment_method_id: "",
                                            amount: subtotal - totalPaid > 0 ? subtotal - totalPaid : 0,
                                        } as any)
                                    }
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Agregar Pago
                                </Button>
                            </div>

                            {/* Totals & Submit */}
                            <div className="flex flex-col items-end pt-6 border-t gap-1 mt-6">
                                <div className="text-right w-full sm:w-64">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted">Subtotal:</span>
                                        <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2 pb-2 border-b">
                                        <span className="text-muted">Pagos Recibidos:</span>
                                        <span className="text-emerald-600 font-semibold">{formatCurrency(totalPaid)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg items-center">
                                        <span className="text-muted">Total a Pagar:</span>
                                        <span className={`font-bold ${subtotal - totalPaid > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                                            {formatCurrency(subtotal - totalPaid > 0 ? subtotal - totalPaid : 0)}
                                        </span>
                                    </div>
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
                                    <Button type="submit" disabled={isPending || isCashShiftClosed}>
                                        {isPending ? <Spinner size="sm" /> : "Registrar Factura"}
                                    </Button>
                                </div>
                            </div>
                        </fieldset>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
