"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { verifyToken, activateAccount } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ShieldCheck, Lock } from "lucide-react";

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Initialize state based on token presence to avoid effect update
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(
    token ? null : false,
  );

  // Verify token on mount
  useEffect(() => {
    if (!token) return;

    verifyToken(token)
      .then((isValid) => setIsTokenValid(isValid))
      .catch(() => setIsTokenValid(false));
  }, [token]);

  const activateMut = useMutation({
    mutationFn: activateAccount,
    onSuccess: () => {
      toast.success("Cuenta activada correctamente");
      // Small delay to show success state before redirect
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message || "Error al activar la cuenta";
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    activateMut.mutate({ token, password });
  };

  if (isTokenValid === null) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Spinner size="lg" />
        <p className="text-muted text-sm">Verificando invitación...</p>
      </div>
    );
  }

  if (isTokenValid === false) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Enlace inválido o expirado
        </h2>
        <p className="text-muted text-sm max-w-xs mx-auto">
          Este enlace de invitación ya no es válido. Por favor, solicita al
          administrador que te envíe una nueva invitación.
        </p>
        <Button
          onClick={() => router.push("/login")}
          variant="outline"
          className="mt-4"
        >
          Volver al inicio
        </Button>
      </div>
    );
  }

  if (activateMut.isSuccess) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          ¡Cuenta Activada!
        </h2>
        <p className="text-muted text-sm max-w-xs mx-auto">
          Tu contraseña ha sido configurada correctamente. Redirigiendo al
          panel...
        </p>
        <Spinner size="sm" className="mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] bg-brand-50 mb-2">
          <ShieldCheck className="w-6 h-6 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Configura tu contraseña
        </h1>
        <p className="text-sm text-muted">
          Ingresa una contraseña segura para acceder a tu cuenta en DermaMED.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Nueva Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Confirmar Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-9"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
        </div>

        <ul className="text-xs text-muted space-y-1 pl-1">
          <li className={password.length >= 8 ? "text-emerald-600" : ""}>
            • Mínimo 8 caracteres
          </li>
          {/* Add more checks if needed visually, handled by HTML5 validation mostly */}
        </ul>

        <Button
          type="submit"
          className="w-full"
          isLoading={activateMut.isPending}
          disabled={!password || !confirmPassword}
        >
          Activar Cuenta
        </Button>
      </form>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-surface-secondary p-4">
      <Card className="w-full max-w-[400px] shadow-lg border-opacity-50">
        <CardBody className="p-6 md:p-8">
          <Suspense
            fallback={
              <div className="flex justify-center p-8">
                <Spinner />
              </div>
            }
          >
            <SetupPasswordForm />
          </Suspense>
        </CardBody>
      </Card>

      <div className="fixed bottom-4 text-center w-full text-xs text-muted-foreground">
        © 2024 DermaMED. Sistema de Gestión Clínica.
      </div>
    </div>
  );
}
