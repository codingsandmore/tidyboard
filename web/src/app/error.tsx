"use client";

import { useEffect } from "react";
import { TB } from "@/lib/tokens";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in development; replace with your error reporter in production
    console.error("[Tidyboard] Unhandled error:", error);
  }, [error]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: TB.bg,
        fontFamily: TB.fontBody,
        padding: "24px",
        textAlign: "center",
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          fontFamily: TB.fontDisplay,
          fontSize: 24,
          fontWeight: 600,
          color: TB.primary,
          letterSpacing: "-0.02em",
          marginBottom: 48,
        }}
      >
        Tidyboard
      </div>

      {/* Icon area */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#FEF2F2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          marginBottom: 24,
        }}
        aria-hidden="true"
      >
        ⚠
      </div>

      {/* Heading */}
      <h1
        style={{
          fontFamily: TB.fontDisplay,
          fontSize: 30,
          fontWeight: 500,
          color: TB.text,
          letterSpacing: "-0.015em",
          margin: "0 0 12px",
        }}
      >
        Something went wrong
      </h1>

      {/* Subtext */}
      <p
        style={{
          fontSize: 16,
          color: TB.text2,
          margin: "0 0 36px",
          maxWidth: 360,
          lineHeight: 1.6,
        }}
      >
        An unexpected error occurred. Your family&apos;s data is safe — this
        is just a hiccup.
      </p>

      {/* Error digest for support */}
      {error.digest && (
        <p
          style={{
            fontSize: 12,
            color: TB.muted,
            fontFamily: TB.fontMono,
            margin: "0 0 28px",
          }}
        >
          Error ID: {error.digest}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 48,
            padding: "0 24px",
            background: TB.primary,
            color: "#fff",
            borderRadius: TB.r.md,
            fontFamily: TB.fontBody,
            fontSize: 15,
            fontWeight: 550,
            border: "none",
            cursor: "pointer",
            transition: "background .12s",
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 48,
            padding: "0 24px",
            background: TB.surface,
            color: TB.text,
            borderRadius: TB.r.md,
            fontFamily: TB.fontBody,
            fontSize: 15,
            fontWeight: 550,
            border: `1px solid ${TB.border}`,
            textDecoration: "none",
            transition: "background .12s",
          }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}
