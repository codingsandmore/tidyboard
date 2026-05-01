"use client";

import { useEffect } from "react";
import { TB } from "@/lib/tokens";
import { ErrorAlert } from "@/components/ui/error-alert";

/**
 * Root error boundary — catches errors thrown in the root layout itself.
 *
 * Spec section C.4.d (docs/specs/2026-04-30-events-recipes-errors-design.md):
 * render <ErrorAlert/> + a "Try again" button calling `reset()`. Per Next.js
 * convention, global-error.tsx must include its own <html><body> wrappers
 * because the root layout has not rendered when this boundary fires.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: globalThis.Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Tidyboard] Root-level unhandled error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: TB.bg,
          fontFamily: TB.fontBody,
          color: TB.text,
        }}
      >
        <div
          style={{
            width: "100vw",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
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
              marginBottom: 32,
            }}
          >
            Tidyboard
          </div>

          {/* Heading */}
          <h1
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 30,
              fontWeight: 500,
              color: TB.text,
              letterSpacing: "-0.015em",
              margin: "0 0 8px",
              textAlign: "center",
            }}
          >
            Something went wrong
          </h1>

          {/* Subtext */}
          <p
            style={{
              fontSize: 15,
              color: TB.text2,
              margin: "0 0 20px",
              maxWidth: 520,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            A root-level error occurred. Your family&apos;s data is safe — try
            again or return home.
          </p>

          {/* End-to-end debug surface */}
          <div style={{ width: "100%", maxWidth: 560 }}>
            <ErrorAlert error={error} />
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            <button
              type="button"
              onClick={reset}
              data-testid="global-error-try-again"
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
      </body>
    </html>
  );
}
