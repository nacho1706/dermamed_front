"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <h2 className="text-2xl font-bold">Un error global ha ocurrido.</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-brand-600 text-white rounded-md"
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
