"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 480 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: 28,
            }}
          >
            ⚠️
          </div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: "0 0 0.5rem",
            }}
          >
            Un error inesperado ha ocurrido
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#64748b",
              margin: "0 0 1.5rem",
              lineHeight: 1.6,
            }}
          >
            {error.message || "Algo salió mal. Por favor, intente nuevamente."}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.625rem 1.5rem",
              backgroundColor: "#0d9488",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 0.15s",
            }}
            onMouseOver={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "#14b8a6")
            }
            onMouseOut={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "#0d9488")
            }
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
