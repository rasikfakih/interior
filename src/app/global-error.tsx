"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf7f2",
          color: "#1a1814",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#7a6e58",
              marginBottom: "1rem",
            }}
          >
            Vercel runtime error
          </p>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 500, letterSpacing: "-0.01em" }}>
            This page could not load.
          </h1>
          <p style={{ color: "#7a6e58", marginTop: "1rem", lineHeight: 1.6 }}>
            A server error happened while rendering this route. Common causes: a missing
            environment variable, a stale deploy, or a crash inside the route's data
            fetcher.
          </p>
          {error?.digest ? (
            <p
              style={{
                fontSize: "11px",
                marginTop: "1rem",
                padding: "0.5rem 0.75rem",
                background: "rgba(0,0,0,0.04)",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              digest: {error.digest}
            </p>
          ) : null}
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
            <button
              onClick={reset}
              style={{
                padding: "0.5rem 1rem",
                background: "#1a1814",
                color: "#faf7f2",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{ padding: "0.5rem 1rem", border: "1px solid #1a1814", color: "#1a1814", textDecoration: "none" }}
            >
              View site
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
