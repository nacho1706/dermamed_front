import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  type ServiceFilters,
} from "@/services/services";
import { PaginatedServicesSchema, ServiceSchema } from "@/lib/schemas/service";
import { sileo } from "sileo";

export function useServices(filters?: ServiceFilters) {
  return useQuery({
    queryKey: ["services", filters],
    queryFn: async () => {
      const response = await getServices(filters);
      return PaginatedServicesSchema.parse(response);
    },
  });
}

export function useService(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["services", id],
    queryFn: async () => {
      const response = await getService(id);
      return ServiceSchema.parse(response);
    },
    enabled: options?.enabled,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      sileo.success({
        title: "Servicio creado",
        description: "El servicio fue creado correctamente.",
      });
    },
    onError: () => {
      sileo.error({
        title: "Error",
        description: "No se pudo crear el servicio.",
      });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<import("@/types").Service>;
    }) => updateService(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["services", variables.id] });
      sileo.success({
        title: "Servicio actualizado",
        description: "Los cambios fueron guardados correctamente.",
      });
    },
    onError: () => {
      sileo.error({
        title: "Error",
        description: "No se pudo actualizar el servicio.",
      });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      sileo.success({
        title: "Servicio eliminado",
        description: "El servicio fue eliminado correctamente.",
      });
    },
    onError: () => {
      sileo.error({
        title: "Error",
        description: "No se pudo eliminar el servicio.",
      });
    },
  });
}
