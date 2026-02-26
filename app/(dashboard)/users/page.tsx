"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsers,
  updateUser,
  deleteUser,
  inviteUser,
  resendInvite,
  type UserFilters,
} from "@/services/users";
import { getRoles } from "@/services/roles";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Search,
  Users,
  UserCog,
  Shield,
  Stethoscope,
  Pencil,
  Trash2,
  Mail,
  Send,
} from "lucide-react";
import type { User, Role } from "@/types";

// ─── Role Display Config ────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  clinic_manager: "Dirección",
  doctor: "Doctor",
  receptionist: "Recepcionista",
};

const ROLE_STYLES: Record<string, string> = {
  clinic_manager: "bg-indigo-50 text-indigo-700 border-indigo-200",
  doctor: "bg-blue-50 text-blue-700 border-blue-200",
  receptionist: "bg-amber-50 text-amber-700 border-amber-200",
};

// ─── Helper Components ──────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  const style =
    ROLE_STYLES[role.name] ?? "bg-gray-50 text-gray-700 border-gray-200";
  const label = ROLE_LABELS[role.name] ?? role.name;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}
    >
      {label}
    </span>
  );
}

function StatusBadge({ user }: { user: User }) {
  const isPending = user.status === "pending_activation";

  if (isPending) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-yellow-50 text-yellow-700 border-yellow-200">
        Pendiente
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        user.is_active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-red-50 text-red-700 border-red-200"
      }`}
    >
      {user.is_active ? "Activo" : "Inactivo"}
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon: any;
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

// ─── User Form Modal (Invite / Edit) ────────────────────────────────────────

function UserFormModal({
  isOpen,
  onClose,
  user,
  roles,
}: {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  roles: Role[];
}) {
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState("");
  const [cuit, setCuit] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Check if the "doctor" role is selected (by name, not hardcoded ID)
  const doctorRole = roles.find((r) => r.name === "doctor");
  const isDoctorSelected = doctorRole
    ? roleIds.includes(doctorRole.id.toString())
    : false;

  React.useEffect(() => {
    if (isOpen) {
      if (user) {
        setName(user.name);
        setEmail(user.email);
        setRoleIds(user.roles?.map((r) => r.id.toString()) || []);
        setSpecialty(user.specialty || "");
        setCuit(user.cuit || "");
        setIsActive(user.is_active);
      } else {
        setName("");
        setEmail("");
        setRoleIds([]);
        setSpecialty("");
        setCuit("");
        setIsActive(true);
      }
    }
  }, [isOpen, user]);

  const inviteMut = useMutation({
    mutationFn: inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-kpi"] });
      toast.success("Invitación enviada correctamente");
      onClose();
    },
    onError: () => toast.error("Error al invitar al usuario"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-kpi"] });
      toast.success("Usuario actualizado correctamente");
      onClose();
    },
    onError: () => toast.error("Error al actualizar el usuario"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      name,
      email,
      role_ids: roleIds.map((id) => parseInt(id)),
    };

    if (isDoctorSelected) {
      data.specialty = specialty || null;
    }

    if (isEdit && user) {
      // Logic only for edit
      data.cuit = cuit || null;
      data.is_active = isActive;
      updateMut.mutate({ id: user.id, data });
    } else {
      // Logic only for invite
      inviteMut.mutate(data);
    }
  };

  const isPending = inviteMut.isPending || updateMut.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Usuario" : "Invitar Usuario"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Nombre *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Juan Pérez"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Email *
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="juan@dermamed.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Roles * (Puede seleccionar varios)
            </label>
            <div className="flex flex-col gap-2 border border-border p-3 rounded-[var(--radius-md)] bg-surface-secondary/30">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={roleIds.includes(role.id.toString())}
                    onChange={(e) => {
                      if (e.target.checked)
                        setRoleIds([...roleIds, role.id.toString()]);
                      else
                        setRoleIds(
                          roleIds.filter((id) => id !== role.id.toString()),
                        );
                    }}
                    className="rounded border-border text-brand-600 focus:ring-brand-500"
                  />
                  <span>{ROLE_LABELS[role.name] ?? role.name}</span>
                </label>
              ))}
            </div>
          </div>

          {isDoctorSelected && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Especialidad
              </label>
              <Input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ej: Dermatólogo"
              />
            </div>
          )}

          {isEdit && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  CUIT
                </label>
                <Input
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value)}
                  placeholder="XX-XXXXXXXX-X"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-[var(--radius-md)] bg-surface-secondary/50">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-foreground block">
                    Estado del Usuario
                  </label>
                  <p className="text-xs text-muted">
                    {isActive
                      ? "El usuario puede acceder al sistema"
                      : "El acceso está bloqueado"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                    isActive ? "bg-brand-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`${
                      isActive ? "translate-x-6" : "translate-x-1"
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </button>
              </div>
            </>
          )}

          {!isEdit && (
            <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-200">
              <p className="font-semibold mb-1">Nota de Seguridad:</p>
              El usuario recibirá un correo electrónico con un enlace único para
              configurar su contraseña. El enlace expirará en 24 horas.
            </div>
          )}

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
              disabled={isPending || !name || !email || roleIds.length === 0}
            >
              {isPending ? (
                <Spinner size="sm" />
              ) : isEdit ? (
                "Guardar Cambios"
              ) : (
                "Enviar Invitación"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Users Page ─────────────────────────────────────────────────────────────

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();

  React.useEffect(() => {
    if (!hasRole("clinic_manager")) {
      router.push("/dashboard");
    }
  }, [hasRole, router]);

  if (!hasRole("clinic_manager")) return null;

  // Fetch roles dynamically from API (no hardcoded IDs)
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });

  // Main users query — filter by role name (string), not role_id
  const { data, isLoading } = useQuery({
    queryKey: ["users", debouncedSearch, roleFilter, page],
    queryFn: () =>
      getUsers({
        name: debouncedSearch || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        pagina: page,
        cantidad: 10,
      }),
  });

  // KPI Queries — filter by role name (string)
  const { data: totalUsersData } = useQuery({
    queryKey: ["users-kpi", "total"],
    queryFn: () => getUsers({ cantidad: 1 }),
  });

  const { data: activeUsersData } = useQuery({
    queryKey: ["users-kpi", "active"],
    queryFn: () => getUsers({ is_active: true, cantidad: 1 }),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["users-kpi", "doctors"],
    queryFn: () => getUsers({ role: "doctor", cantidad: 1 }),
  });

  const { data: receptionistsData } = useQuery({
    queryKey: ["users-kpi", "receptionists"],
    queryFn: () => getUsers({ role: "receptionist", cantidad: 1 }),
  });

  const { data: managersData } = useQuery({
    queryKey: ["users-kpi", "managers"],
    queryFn: () => getUsers({ role: "clinic_manager", cantidad: 1 }),
  });

  const users = data?.data || [];
  const totalPages = data?.meta?.last_page ?? 1;

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-kpi"] });
      toast.success("Usuario eliminado correctamente");
    },
    onError: () => toast.error("Error al eliminar el usuario"),
  });

  const resendMut = useMutation({
    mutationFn: resendInvite,
    onSuccess: () => {
      toast.success("Invitación reenviada correctamente");
    },
    onError: () => toast.error("Error al reenviar la invitación"),
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      deleteMut.mutate(id);
    }
  };

  const handleResend = (id: number) => {
    resendMut.mutate(id);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(undefined);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-muted mt-1">
            Administra los accesos y roles de doctores y personal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setEditingUser(undefined);
              setIsFormOpen(true);
            }}
          >
            <Send className="w-4 h-4 mr-2" />
            Invitar Usuario
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Usuarios"
          value={totalUsersData?.meta?.total ?? "..."}
          icon={Users}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
        <KpiCard
          label="Doctores"
          value={doctorsData?.meta?.total ?? "..."}
          icon={Stethoscope}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KpiCard
          label="Recepcionistas"
          value={receptionistsData?.meta?.total ?? "..."}
          icon={UserCog}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KpiCard
          label="Dirección"
          value={managersData?.meta?.total ?? "..."}
          icon={Shield}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <KpiCard
          label="Usuarios Activos"
          value={activeUsersData?.meta?.total ?? "..."}
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-[200px]">
            <Select
              value={roleFilter}
              onValueChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {ROLE_LABELS[role.name] ?? role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted font-medium">
                No se encontraron usuarios
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Usuario
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3 hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Rol
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Estado
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted px-6 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-surface-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs ring-2 ring-white shadow-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {user.name}
                          </span>
                          <span className="text-xs text-muted md:hidden">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className="text-sm text-foreground">
                        {user.email}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {user.roles?.map((r) => (
                          <RoleBadge key={r.id} role={r} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge user={user} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === "pending_activation" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-brand-600 hover:text-brand-700"
                            title="Reenviar invitación"
                            onClick={() => handleResend(user.id)}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Editar"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="w-4 h-4 text-muted hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Siguiente
            </Button>
          </div>
        )}
      </Card>

      <UserFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        user={editingUser}
        roles={roles}
      />
    </div>
  );
}
