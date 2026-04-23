import Link from "next/link";
import { TB } from "@/lib/tokens";

export default function NotFound() {
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

      {/* Large friendly 404 */}
      <div
        style={{
          fontFamily: TB.fontDisplay,
          fontSize: 96,
          fontWeight: 500,
          color: TB.primary,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          marginBottom: 16,
          opacity: 0.15,
        }}
        aria-hidden="true"
      >
        404
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
        Page not found
      </h1>

      {/* Subtext */}
      <p
        style={{
          fontSize: 16,
          color: TB.text2,
          margin: "0 0 36px",
          maxWidth: 340,
          lineHeight: 1.6,
        }}
      >
        This page doesn&apos;t exist — but your family dashboard does.
      </p>

      {/* CTA */}
      <Link
        href="/"
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
          textDecoration: "none",
          transition: "background .12s",
        }}
      >
        Take me home
      </Link>
    </div>
  );
}
