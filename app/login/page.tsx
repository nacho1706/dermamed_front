"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { AxiosError } from "axios";

const loginSchema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await login(data.email, data.password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 401) {
          setError("Email o contraseña incorrectos");
        } else {
          setError(
            "Error de conexión. Verificá que el servidor esté corriendo.",
          );
        }
      } else {
        setError("Ocurrió un error inesperado");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-brand-50/30 to-neutral-100 p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -right-40 w-80 h-80 bg-brand-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-brand-300/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-xl shadow-brand-500/25 mb-4">
            <span className="text-white font-bold text-2xl">D</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Derma<span className="text-brand-600">MED</span>
          </h1>
          <p className="text-muted mt-2">Sistema de Gestión Clínica</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-[var(--shadow-xl)] border-0 bg-white/80 backdrop-blur-sm">
          <CardBody className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                Iniciar Sesión
              </h2>
              <p className="text-sm text-muted mt-1">
                Ingresá tus credenciales para acceder
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-sm text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="admin@dermamed.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register("email")}
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register("password")}
              />

              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full mt-2"
                size="lg"
              >
                Ingresar
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted mt-6">
          DermaMED PMS © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
