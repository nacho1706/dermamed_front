"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getServices,
  createService,
  updateService,
  deleteService,
} from "@/services/services";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  Clock,
  DollarSign,
  Plus,
  Search,
  Pencil,
  Trash2,
  List,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import type { Service } from "@/types";

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="hover:shadow-[var(--shadow-md)] transition-all duration-200">
      <CardBody className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted font-medium">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {value}
            </p>
          </div>
        </div>
        <div
          className={`w-10 h-10 rounded-[var(--radius-lg)] ${iconBg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Service Form Modal ─────────────────────────────────────────────────────

function ServiceFormModal({
  isOpen,
  onClose,
  service,
}: {
  isOpen: boolean;
  onClose: () => void;
  service?: Service;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!service;

  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [price, setPrice] = useState(service?.price?.toString() || "");
  const [duration, setDuration] = useState(
    service?.duration_minutes?.toString() || "",
  );

  // Reset form when service changes
  React.useEffect(() => {
    if (isOpen) {
      setName(service?.name || "");
      setDescription(service?.description || "");
      setPrice(service?.price?.toString() || "");
      setDuration(service?.duration_minutes?.toString() || "");
    }
  }, [isOpen, service]);

  const createMut = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio creado correctamente");
      onClose();
    },
    onError: () => toast.error("Error al crear el servicio"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Service> }) =>
      updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio actualizado correctamente");
      onClose();
    },
    onError: () => toast.error("Error al actualizar el servicio"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      description: description || undefined,
      price: parseFloat(price),
      duration_minutes: parseInt(duration, 10),
    };

    if (isEdit && service) {
      updateMut.mutate({ id: service.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Servicio" : "Nuevo Servicio"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Nombre *
            </label>
            <Input
              placeholder="Ej: Consulta Dermatológica"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Descripción
            </label>
            <Input
              placeholder="Descripción del tratamiento"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Precio *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-7"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Duración (min) *
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  placeholder="30"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  min
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
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
              disabled={isPending || !name || !price || !duration}
            >
              {isPending ? (
                <Spinner size="sm" />
              ) : isEdit ? (
                "Guardar Cambios"
              ) : (
                "Crear Servicio"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Services Page ──────────────────────────────────────────────────────────

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const debouncedSearch = useDebounce(search, 500);

  React.useEffect(() => {
    if (!hasRole("clinic_manager")) {
      router.push("/dashboard");
    }
  }, [hasRole, router]);

  if (!hasRole("clinic_manager")) return null;

  const { data, isLoading } = useQuery({
    queryKey: ["services", debouncedSearch, page],
    queryFn: () =>
      getServices({
        name: debouncedSearch || undefined,
        pagina: page,
        cantidad: 10,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio eliminado correctamente");
    },
    onError: () => toast.error("Error al eliminar el servicio"),
  });

  const services = data?.data || [];
  const totalPages = data?.meta?.last_page ?? 1;
  const totalServices = data?.meta?.total ?? 0;

  // Compute KPIs from current data (Note: In a real app involving large datasets, these should come from the backend)
  const avgPrice =
    services.length > 0
      ? services.reduce((acc, s) => acc + Number(s.price), 0) / services.length
      : 0;

  const maxPrice =
    services.length > 0 ? Math.max(...services.map((s) => Number(s.price))) : 0;

  const avgDuration =
    services.length > 0
      ? services.reduce((acc, s) => acc + Number(s.duration_minutes), 0) /
        services.length
      : 0;

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este servicio?")) {
      deleteMut.mutate(id);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingService(undefined);
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Servicios y Tratamientos
          </h1>
          <p className="text-sm text-muted mt-1">
            Gestiona el catálogo de servicios médicos, precios y duraciones.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setEditingService(undefined);
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Servicio
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Servicios"
          value={isLoading ? "…" : totalServices}
          icon={Stethoscope}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KpiCard
          label="Precio Promedio"
          value={
            isLoading
              ? "…"
              : `$${avgPrice.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
          }
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KpiCard
          label="Servicio Más Caro"
          value={
            isLoading
              ? "…"
              : `$${maxPrice.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
          }
          icon={TrendingUp}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KpiCard
          label="Duración Promedio"
          value={isLoading ? "…" : `${Math.round(avgDuration)} min`}
          icon={Clock}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              placeholder="Buscar servicio por nombre..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
        </CardBody>
      </Card>

      {/* Services Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Stethoscope className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted font-medium">
                No se encontraron servicios
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Intenta con otro término de búsqueda o crea un nuevo servicio.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Nombre
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3 hidden md:table-cell">
                    Descripción
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Duración
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Precio
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {services.map((service) => (
                  <tr
                    key={service.id}
                    className="hover:bg-surface-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">
                        {service.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="text-sm text-muted truncate max-w-[300px]">
                        {service.description || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        <Clock className="w-3 h-3 mr-1" />
                        {service.duration_minutes} min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-foreground">
                        $
                        {Number(service.price).toLocaleString("es-AR", {
                          minimumFractionDigits: 0,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(service)}
                        >
                          <Pencil className="w-4 h-4 text-muted hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500/70 hover:text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ServiceFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        service={editingService}
      />
    </div>
  );
}
