# DermaMED Frontend — Instrucciones para Agentes

> Lee `../AGENTS.md` primero para contexto general del proyecto.

> Lee `../AGENTS.md` primero para contexto general del proyecto.

> **⚠️ REGLA CRÍTICA DE ENTORNO**:
> **NO DEBES USAR NPM NI NINGÚN COMANDO DE NODE.JS DIRECTAMENTE EN EL HOST (MAC).**
> Toda instalación de dependencias, scripts de build o testeo **DEBE** hacerse usando Docker, de la siguiente manera:
> `docker exec frontend-dermamed npm <comando>`
>
> **Ejemplos obligatorios:**
>
> - `docker exec frontend-dermamed npm install`
> - `docker exec frontend-dermamed npm run build`
>
> **Las dependencias de este proyecto usan un volumen anónimo persistente en Docker (`/app/node_modules`). Si instalas en tu host, crearás un `node_modules` en tu sistema Mac que Docker va a ignorar, generando un desperdicio de espacio y posibles conflictos de binarios.**

## Entorno

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript strict
- **Styling**: Tailwind CSS v4
- **State**: TanStack Query (server state), react-hook-form + zod (forms)
- **Icons**: lucide-react
- **Notifications**: sonner

---

## Seguridad y Arquitectura (Healthcare Standard)

### 1. Renderizado Condicional Estricto

- **Regla**: NUNCA ocultes información sensible usando CSS (`display: none`, `opacity: 0`).
- **Acción**: Si el usuario no tiene permiso, el componente NO se renderiza.
  - Ejemplo: `{hasRole('doctor') && <MedicalRecordSection />}`.

### 2. Soporte para Roles Múltiples

- **Regla**: El usuario puede tener un array de roles.
- **Acción**: NUNCA valides con `user.role === 'clinic_manager'`. Usá `user.roles.includes('clinic_manager')`.
- Adaptá los componentes de Sidebar y Route Guards para manejar arrays de roles.

### 3. Inmutabilidad (No Hard Deletes en UI)

- **Regla**: Las acciones de "Borrar" en la UI deben disparar borrados lógicos (Soft Deletes) en el backend.
- Asegurate de que la UI refleje que un registro fue "eliminado" pero permanece en el historial si es necesario (ej. auditoría).

### 4. Default Deny (Frontend logic)

- Toda nueva vista o componente de acción debe estar bloqueado por defecto.
- Solo renderizá elementos si se verifica explícitamente el permiso en el array de roles.

---

> **Antes de modificar componentes UI**, leé el skill `interface-design` en `.agent/skills/interface-design/SKILL.md`.
> **Antes de escribir lógica React/Next.js**, leé el skill `vercel-react-best-practices` en `.agent/skills/vercel-react-best-practices/SKILL.md`.

---

## Estructura de Carpetas

```
frontend/app/
├── (auth)/              ← Rutas sin layout (login)
│   └── login/page.tsx
├── (dashboard)/         ← Rutas con layout principal
│   ├── layout.tsx
│   ├── page.tsx           ← Dashboard home
│   ├── patients/
│   │   ├── page.tsx       ← Listado
│   │   ├── [id]/page.tsx  ← Detalle
│   │   └── new/page.tsx   ← Formulario alta
│   └── appointments/
│       └── page.tsx       ← Calendario
├── components/
│   ├── ui/              ← Componentes base reutilizables
│   └── features/        ← Componentes de dominio
├── hooks/               ← Custom hooks
├── lib/                 ← Utilidades, API client
├── services/            ← Funciones de API por módulo
└── types/               ← TypeScript interfaces
```

### Naming

| Concepto   | Convención                      | Ejemplo                  |
| ---------- | ------------------------------- | ------------------------ |
| Components | PascalCase                      | `PatientForm.tsx`        |
| Hooks      | camelCase con use               | `usePatients.ts`         |
| Services   | camelCase                       | `patientService.ts`      |
| Types      | PascalCase + interface          | `Patient`, `Appointment` |
| Páginas    | `page.tsx` (Next.js convention) | `patients/page.tsx`      |

> **Rutas siempre en inglés**: `/patients/new`, no `/pacientes/nuevo`

---

## Design System

> **REGLA**: No usar clases `dark:` de Tailwind. La app es light-mode only. Las clases `dark:` causan que macOS dark mode rompa los backgrounds.

### Color Tokens

| Token                 | Value     | Uso                               |
| --------------------- | --------- | --------------------------------- |
| `--background`        | `#ffffff` | Page background                   |
| `--foreground`        | `#0f172a` | Primary text                      |
| `--surface`           | `#ffffff` | Card/component backgrounds        |
| `--surface-secondary` | `#f8fafc` | Subtle background differentiation |
| `--border`            | `#e2e8f0` | Standard borders                  |
| `--border-hover`      | `#cbd5e1` | Hover state borders               |
| `--muted`             | `#64748b` | Secondary text                    |
| `--muted-foreground`  | `#94a3b8` | Placeholder text                  |
| `brand-500`           | `#14b8a6` | Primary accent (teal)             |
| `brand-600`           | `#0d9488` | Buttons, active states            |

### Tailwind: Usar Tokens

| ❌ No usar        | ✅ Usar                      |
| ----------------- | ---------------------------- |
| `bg-white`        | `bg-surface`                 |
| `text-gray-900`   | `text-foreground`            |
| `text-gray-500`   | `text-muted`                 |
| `border-gray-200` | `border-border`              |
| `bg-gray-50`      | `bg-surface-secondary`       |
| `rounded-md`      | `rounded-[var(--radius-md)]` |

### Depth Strategy

Borders-only con subtle shadows en elevated surfaces (modals, dropdowns). Sin dramatic drop shadows.

### Border Radius Scale

- `--radius-sm`: 0.375rem — inputs, small buttons
- `--radius-md`: 0.5rem — buttons, inputs, cards
- `--radius-lg`: 0.75rem — cards, containers
- `--radius-xl`: 1rem — modals

### Typography

- Font: Inter (sans), JetBrains Mono (mono)
- Page titles: `text-2xl font-bold text-foreground`
- Section labels: `text-sm font-bold uppercase tracking-wider`
- Body: `text-sm text-foreground`
- Metadata: `text-xs text-muted`

### Calendar Status Colors

| Status    | Background   | Border        | Text          | Dot           |
| --------- | ------------ | ------------- | ------------- | ------------- |
| Pending   | `amber-50`   | `amber-200`   | `amber-800`   | `amber-400`   |
| Confirmed | `blue-50`    | `blue-200`    | `blue-800`    | `blue-400`    |
| Attended  | `emerald-50` | `emerald-200` | `emerald-800` | `emerald-400` |
| Cancelled | `red-50`     | `red-200`     | `red-700`     | `red-400`     |

### Component Patterns

**Select (Radix)**: Trigger `bg-surface border-border`, focus `brand-500/20` ring. Content `bg-surface border-border shadow-[var(--shadow-md)]`. Item focus `bg-brand-50 text-brand-900`.

**Dialog (Radix)**: Overlay `bg-black/60 backdrop-blur-sm`. Content `bg-surface shadow-[var(--shadow-xl)] rounded-[var(--radius-xl)]`.

**Form Controls**: Background `bg-surface`. Border `border-border` → `border-[var(--border-hover)]` on hover. Focus `ring-2 ring-brand-500/20 border-brand-500`. Transitions `transition-all duration-150`.

---

## Learnings

> Si durante una tarea descubrís un error o patrón que no funciona,
> **agregá la solución aquí** para no repetir el problema.

- **Problema**: Usar `dark:` en clases de Tailwind causa backgrounds negros en macOS dark mode → **Solución**: No usar `dark:` nunca. La app es light-mode only.
- **Problema**: Componentes con colores hardcodeados (`bg-white`, `text-gray-900`) → **Solución**: Siempre usar tokens del design system (`bg-surface`, `text-foreground`).
