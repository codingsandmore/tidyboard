import type { Metadata } from "next";
import Link from "next/link";
import { TB } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Offline",
};

const cachedRoutes = [
  { href: "/", label: "Dashboard", description: "Your main family dashboard" },
  { href: "/onboarding", label: "Onboarding", description: "Set up your household" },
  { href: "/calendar", label: "Calendar", description: "Family calendar and events" },
];

export default function OfflinePage() {
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

      {/* Offline icon */}
      <div
        style={{
          fontFamily: TB.fontDisplay,
          fontSize: 72,
          lineHeight: 1,
          marginBottom: 24,
          opacity: 0.15,
          color: TB.primary,
        }}
        aria-hidden="true"
      >
        ⊘
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
        You&apos;re offline
      </h1>

      {/* Subtext */}
      <p
        style={{
          fontSize: 16,
          color: TB.text2,
          margin: "0 0 36px",
          maxWidth: 380,
          lineHeight: 1.6,
        }}
      >
        Tidyboard needs an internet connection for this page. Here&apos;s what
        you can do:
      </p>

      {/* Cached route list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: 360,
          marginBottom: 40,
        }}
      >
        {cachedRoutes.map(({ href, label, description }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "14px 18px",
              background: TB.surface,
              border: `1px solid ${TB.border}`,
              borderRadius: TB.r.md,
              textDecoration: "none",
              textAlign: "left",
              transition: "border-color .12s",
            }}
          >
            <span
              style={{
                fontFamily: TB.fontBody,
                fontSize: 15,
                fontWeight: 550,
                color: TB.primary,
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 13,
                color: TB.text2,
                marginTop: 2,
              }}
            >
              {description}
            </span>
          </Link>
        ))}
      </div>

      {/* Try again hint */}
      <p
        style={{
          fontSize: 13,
          color: TB.muted,
          maxWidth: 300,
          lineHeight: 1.5,
        }}
      >
        Check your connection and refresh to continue where you left off.
      </p>
    </div>
  );
}
