"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { DoctorAvailabilityForm } from "@/components/features/DoctorAvailabilityForm";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  User,
  Clock,
  Lock,
  Shield,
  Mail,
  Calendar,
  Pencil,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { updateProfile, changePassword } from "@/services/auth";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  specialty: z.string().nullable().optional(),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Ingresá tu contraseña actual"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    password_confirmation: z.string().min(1, "Confirmá tu nueva contraseña"),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirmation"],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  clinic_manager: {
    label: "Dirección",
    color:
      "bg-purple-100 text-purple-700 border-purple-200",
  },
  doctor: {
    label: "Doctor/a",
    color: "bg-brand-100 text-brand-700 border-brand-200",
  },
  receptionist: {
    label: "Recepcionista",
    color: "bg-sky-100 text-sky-700 border-sky-200",
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Tab types ───────────────────────────────────────────────────────────────

type Tab = "info" | "security" | "availability";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, hasRole, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [editingProfile, setEditingProfile] = useState(false);

  const isDoctor = hasRole("doctor");

  // ─── Profile form ─────────────────────────────────────────────────────────

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name ?? "",
      first_name: user?.first_name ?? null,
      last_name: user?.last_name ?? null,
      specialty: user?.specialty ?? null,
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => updateProfile(data),
    onSuccess: async () => {
      await refreshUser();
      toast.success("Perfil actualizado correctamente");
      setEditingProfile(false);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ?? "Error al actualizar el perfil";
      toast.error(msg);
    },
  });

  // ─── Password form ────────────────────────────────────────────────────────

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      password: "",
      password_confirmation: "",
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordFormValues) => changePassword(data),
    onSuccess: () => {
      toast.success("Contraseña actualizada correctamente");
      passwordForm.reset();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ?? "Error al cambiar la contraseña";
      toast.error(msg);
    },
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // ─── Tab config ───────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "info",
      label: "Mi Perfil",
      icon: <User className="w-4 h-4" />,
    },
    {
      id: "security",
      label: "Seguridad",
      icon: <Lock className="w-4 h-4" />,
    },
    ...(isDoctor
      ? [
          {
            id: "availability" as Tab,
            label: "Disponibilidad",
            icon: <Clock className="w-4 h-4" />,
          },
        ]
      : []),
  ];

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-sm text-muted mt-0.5">
          Gestioná tu información personal, seguridad y configuraciones.
        </p>
      </div>

      {/* ── Avatar + Summary Card ────────────────────────────────── */}
      <div
        className="rounded-[var(--radius-xl)] overflow-hidden border border-border"
        style={{ background: "var(--surface)" }}
      >
        {/* Gradient banner */}
        <div
          className="h-24 w-full"
          style={{
            background:
              "linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-400) 60%, #a78bfa 100%)",
          }}
        />
        <div className="px-6 pb-5 -mt-10 flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg shrink-0"
            style={{
              background:
                "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-800))",
            }}
          >
            {getInitials(user.name)}
          </div>

          {/* User info */}
          <div className="flex-1 sm:pb-1">
            <h2 className="text-lg font-bold text-foreground leading-tight">
              {user.name}
            </h2>
            <p className="text-sm text-muted">{user.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {user.roles.map((role) => {
                const cfg = ROLE_LABELS[role.name];
                return (
                  <span
                    key={role.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg?.color ?? "bg-neutral-100 text-neutral-700 border-neutral-200"}`}
                  >
                    <Shield className="w-3 h-3" />
                    {cfg?.label ?? role.name}
                  </span>
                );
              })}

              {/* Account status badge */}
              {user.is_active ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="w-3 h-3" />
                  Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3 h-3" />
                  Pendiente
                </span>
              )}
            </div>
          </div>

          {/* Quick meta */}
          <div className="hidden md:flex flex-col items-end gap-1 text-xs text-muted self-start mt-10 sm:mt-0 sm:self-end pb-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Miembro desde {formatDate(user.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-[var(--radius-lg)] border border-border bg-surface-secondary w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-surface text-foreground shadow-sm border border-border"
                : "text-muted hover:text-foreground hover:bg-surface/60"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: My Profile ──────────────────────────────────────── */}
      {activeTab === "info" && (
        <div className="space-y-5">
          {/* Personal Information */}
          <Card>
            <CardHeader className="border-b border-border flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-brand-500" />
                <CardTitle className="text-sm font-semibold">
                  Información Personal
                </CardTitle>
              </div>
              {!editingProfile ? (
                <Button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className="gap-1.5 text-xs h-8 px-3"
                  style={{
                    background: "transparent",
                    color: "var(--color-brand-600)",
                    border: "1px solid var(--color-brand-200)",
                    boxShadow: "none",
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingProfile(false);
                      profileForm.reset();
                    }}
                    className="h-8 px-3 text-xs"
                    style={{
                      background: "transparent",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                      boxShadow: "none",
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={profileForm.handleSubmit((data) =>
                      profileMutation.mutate(data)
                    )}
                    disabled={profileMutation.isPending}
                    className="h-8 px-3 text-xs gap-1.5"
                  >
                    {profileMutation.isPending && <Spinner size="sm" />}
                    Guardar
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardBody className="p-5">
              {editingProfile ? (
                <form
                  onSubmit={profileForm.handleSubmit((data) =>
                    profileMutation.mutate(data)
                  )}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="profile-name">Nombre completo *</Label>
                    <Input
                      id="profile-name"
                      {...profileForm.register("name")}
                      placeholder="Nombre completo"
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-xs text-danger">
                        {profileForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-first-name">Nombre</Label>
                    <Input
                      id="profile-first-name"
                      {...profileForm.register("first_name")}
                      placeholder="Nombre"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-last-name">Apellido</Label>
                    <Input
                      id="profile-last-name"
                      {...profileForm.register("last_name")}
                      placeholder="Apellido"
                    />
                  </div>

                  {isDoctor && (
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="profile-specialty">Especialidad</Label>
                      <Input
                        id="profile-specialty"
                        {...profileForm.register("specialty")}
                        placeholder="Ej: Dermatología, Cirugía estética..."
                      />
                    </div>
                  )}
                </form>
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <InfoRow
                    label="Nombre completo"
                    value={user.name}
                  />
                  {user.first_name && (
                    <InfoRow label="Nombre" value={user.first_name} />
                  )}
                  {user.last_name && (
                    <InfoRow label="Apellido" value={user.last_name} />
                  )}
                  <InfoRow
                    label="Correo electrónico"
                    value={user.email}
                  />
                  {isDoctor && (
                    <InfoRow
                      label="Especialidad"
                      value={user.specialty ?? "—"}
                    />
                  )}
                  {user.cuit && (
                    <InfoRow label="CUIT" value={user.cuit} />
                  )}
                </dl>
              )}
            </CardBody>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-500" />
                <CardTitle className="text-sm font-semibold">
                  Información de la Cuenta
                </CardTitle>
              </div>
            </CardHeader>
            <CardBody className="p-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <InfoRow
                  label="Estado"
                  value={
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        user.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {user.is_active ? "Activo" : "Pendiente de activación"}
                    </span>
                  }
                />
                <InfoRow
                  label="Roles asignados"
                  value={
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => {
                        const cfg = ROLE_LABELS[role.name];
                        return (
                          <span
                            key={role.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg?.color ?? "bg-neutral-100 text-neutral-700 border-neutral-200"}`}
                          >
                            {cfg?.label ?? role.name}
                          </span>
                        );
                      })}
                    </div>
                  }
                />
                <InfoRow
                  label="Miembro desde"
                  value={formatDate(user.created_at)}
                />
                <InfoRow
                  label="Última actualización"
                  value={formatDate(user.updated_at)}
                />
              </dl>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Tab: Security ────────────────────────────────────────── */}
      {activeTab === "security" && (
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-500" />
              <CardTitle className="text-sm font-semibold">
                Cambiar Contraseña
              </CardTitle>
            </div>
          </CardHeader>
          <CardBody className="p-5">
            <p className="text-sm text-muted mb-5">
              Utilizá una contraseña segura de al menos 8 caracteres. No la
              compartas con nadie.
            </p>
            <form
              onSubmit={passwordForm.handleSubmit((data) =>
                passwordMutation.mutate(data)
              )}
              className="space-y-4 max-w-md"
            >
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Contraseña actual</Label>
                <Input
                  id="current-password"
                  type="password"
                  {...passwordForm.register("current_password")}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                {passwordForm.formState.errors.current_password && (
                  <p className="text-xs text-danger">
                    {passwordForm.formState.errors.current_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  {...passwordForm.register("password")}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {passwordForm.formState.errors.password && (
                  <p className="text-xs text-danger">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">
                  Confirmar nueva contraseña
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  {...passwordForm.register("password_confirmation")}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {passwordForm.formState.errors.password_confirmation && (
                  <p className="text-xs text-danger">
                    {
                      passwordForm.formState.errors.password_confirmation
                        .message
                    }
                  </p>
                )}
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="gap-2"
                >
                  {passwordMutation.isPending && <Spinner size="sm" />}
                  <Lock className="w-4 h-4" />
                  Actualizar contraseña
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* ── Tab: Availability (doctor only) ─────────────────────── */}
      {activeTab === "availability" && isDoctor && (
        <div className="space-y-3">
          <div className="rounded-[var(--radius-lg)] p-4 border border-brand-200 bg-brand-50/40">
            <p className="text-sm text-brand-800 flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 shrink-0 text-brand-600" />
              Configurá los días y horarios en que estás disponible para
              recibir turnos. Esta información es utilizada por la recepción al
              agendar consultas.
            </p>
          </div>
          <DoctorAvailabilityForm
            doctorId={user.id}
            doctorName={user.name}
          />
        </div>
      )}
    </div>
  );
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted uppercase tracking-wider mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-foreground font-medium">{value ?? "—"}</dd>
    </div>
  );
}
