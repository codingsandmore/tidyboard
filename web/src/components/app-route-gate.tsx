"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/auth-gate";

const PUBLIC_PREFIXES = [
  "/auth",
  "/join",
  "/kiosk",
  "/lock",
  "/login",
  "/offline",
  "/onboarding",
  "/pin-login",
  "/preview",
];

const MEMBER_SELECTION_ROUTES = new Set(["/wallet", "/chores"]);

function isPublicOrPreviewPath(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  const segments = pathname.split("/").filter(Boolean);
  return segments.some((segment) => segment === "preview" || segment.startsWith("preview-"));
}

export function AppRouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";

  if (isPublicOrPreviewPath(pathname)) {
    return <>{children}</>;
  }

  if (MEMBER_SELECTION_ROUTES.has(pathname)) {
    return <AuthGate requireMemberProfile={false}>{children}</AuthGate>;
  }

  return <AuthGate>{children}</AuthGate>;
}
