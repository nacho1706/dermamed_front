"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { QueryProvider } from "@/contexts/query-provider";
import { Toaster as SonnerToaster } from "sonner";
import { Toaster as SileoToaster } from "sileo";
import "sileo/styles.css";

/**
 * Client-side providers wrapper.
 * Extracted into its own "use client" boundary so that the root layout
 * (a Server Component) doesn't directly import context-dependent modules.
 * This prevents the _global-error prerender crash in Next.js 16 where
 * useContext is null during SSG of the fallback error page.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <SonnerToaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
        <SileoToaster position="bottom-right" />
      </AuthProvider>
    </QueryProvider>
  );
}
