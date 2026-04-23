"use client";

/**
 * AdminGate — protects routes that require admin (adult) role.
 *
 * In fallback mode the Smith-Family mock user (Sarah Smith, role='adult')
 * is treated as an admin, so the audit page renders with mock data.
 *
 * Real-mode admin check: member.role === 'adult'.
 * Extend with a server-side `is_admin` flag on AuthAccount when available.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-store";
import { TB } from "@/lib/tokens";
import { useTranslations } from "next-intl";

export function AdminGate({ children }: { children: ReactNode }) {
  const { status, member } = useAuth();
  const t = useTranslations("admin.audit");

  // Still loading auth — render nothing (AuthGate above handles the skeleton)
  if (status === "loading") return null;

  // Authenticated but not an adult member → show friendly gate
  const isAdmin = member?.role === "adult";
  if (!isAdmin) {
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
          gap: 16,
        }}
      >
        <div
          style={{
            background: TB.surface,
            border: `1px solid ${TB.border}`,
            borderRadius: TB.r.xl,
            padding: "32px 40px",
            textAlign: "center",
            maxWidth: 380,
            boxShadow: TB.shadow,
          }}
        >
          <div
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 22,
              fontWeight: 500,
              color: TB.text,
              marginBottom: 8,
            }}
          >
            {t("adminsOnly")}
          </div>
          <div style={{ fontSize: 14, color: TB.text2, marginBottom: 24 }}>
            {t("adminsOnlyDesc")}
          </div>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "8px 18px",
              borderRadius: TB.r.md,
              border: `1px solid ${TB.border}`,
              background: TB.surface,
              color: TB.text2,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {t("homeLink")}
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
