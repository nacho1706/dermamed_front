import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsers,
  getUser,
  inviteUser,
  resendInvite,
  updateUser,
  deleteUser,
  type UserFilters,
} from "@/services/users";
import { PaginatedUsersSchema, UserSchema } from "@/lib/schemas/user";
import { sileo } from "sileo";

export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: async () => {
      const response = await getUsers(filters);
      // Validate the response using Zod
      return PaginatedUsersSchema.parse(response);
    },
  });
}

export function useUser(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: async () => {
      const response = await getUser(id);
      return UserSchema.parse(response);
    },
    enabled: options?.enabled,
  });
}

// Helper block for KPIs
export function useUsersKpi(
  type: "total" | "active" | "doctors" | "receptionists" | "managers",
) {
  return useQuery({
    queryKey: ["users-kpi", type],
    queryFn: async () => {
      const filters: UserFilters = {
        cantidad: 1,
        ...(type === "active" ? { is_active: true } : {}),
        ...(type === "doctors" ? { role: "doctor" } : {}),
        ...(type === "receptionists" ? { role: "receptionist" } : {}),
        ...(type === "managers" ? { role: "clinic_manager" } : {}),
      };

      const response = await getUsers(filters);
      return PaginatedUsersSchema.parse(response);
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-kpi"] });
      sileo.success({
        title: "Invitación enviada",
        description:
          "El usuario recibirá un correo con el enlace de activación.",
      });
    },
    onError: () => {
      sileo.error({
        title: "Error",
        description: "No se pudo enviar la invitación.",
      });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<import("@/types").User> & {
        password?: string;
        role_ids?: number[];
      };
    }) => updateUser(id, data),
    // Optimistic Update Rollback Logic setup can be complex for paginated, but we can do it if needed.
    // For now we invalidate to keep it simple and safe for standard settings forms.
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["users-kpi"] });
      sileo.success({
        title: "Usuario actualizado",
        description: "Los cambios fueron guardados correctamente.",
      });
    },
    onError: () => {
      sileo.error({
        title: "Error",
        description: "No se pudo actualizar el usuario.",
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-kpi"] });
      sileo.success({
        title: "Usuario eliminado",
        description: "El usuario fue eliminado correctamente.",
      });
    },
    onError: () => {
      sileo.error({
        title: "Error",
        description: "No se pudo eliminar el usuario.",
      });
    },
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: resendInvite,
    onSuccess: () => {
      sileo.success({
        title: "Invitación reenviada",
        description: "El correo de invitación fue reenviado correctamente.",
      });
    },
    onError: () => {
      sileo.error({
        title: "Error",
        description: "No se pudo reenviar la invitación.",
      });
    },
  });
}
