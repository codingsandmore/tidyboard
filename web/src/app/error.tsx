"use client";

import { useEffect } from "react";
import { TB } from "@/lib/tokens";
import { ErrorAlert } from "@/components/ui/error-alert";

/**
 * Next.js error boundary for the (root) segment.
 *
 * Spec section C.4.d (docs/specs/2026-04-30-events-recipes-errors-design.md):
 * render <ErrorAlert/> for full status/code/message/request-id context plus a
 * "Try again" button wired to the `reset()` prop. Chrome stays consistent with
 * other static pages (centered card, wordmark, body chrome from tokens).
 */
export default function Error({
  error,
  reset,
}: {
  error: globalThis.Error & { digest?: string };
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
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: TB.bg,
        fontFamily: TB.fontBody,
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
        An unexpected error occurred. Your family&apos;s data is safe — this
        is just a hiccup.
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
          data-testid="error-try-again"
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
