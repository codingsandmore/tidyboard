"use client";

/**
 * AuthGate — protects routes that require authentication.
 *
 * - status === 'loading'         → renders a loading skeleton
 * - status === 'unauthenticated' → redirects to /login
 * - status === 'authenticated'   → requires household/member by default
 */

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-store";
import { TB } from "@/lib/tokens";

interface AuthGateProps {
  children: ReactNode;
  requireOnboarding?: boolean;
}

export function AuthGate({ children, requireOnboarding = true }: AuthGateProps) {
  const { status, account, household, member } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasCompletedOnboarding = Boolean(account && household && member);

  useEffect(() => {
    if (status === "unauthenticated") {
      const returnTo = pathname && pathname !== "/" ? `?returnTo=${encodeURIComponent(pathname)}` : "";
      router.push(`/login${returnTo}`);
      return;
    }

    if (status === "authenticated" && requireOnboarding && !hasCompletedOnboarding) {
      router.push("/onboarding");
    }
  }, [hasCompletedOnboarding, pathname, requireOnboarding, status, router]);

  if (status === "loading") {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: TB.bg,
          fontFamily: TB.fontBody,
          color: TB.text2,
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  if (status === "unauthenticated") {
    // Redirect is handled in useEffect; render nothing while navigating
    return null;
  }

  if (requireOnboarding && !hasCompletedOnboarding) {
    return null;
  }

  return <>{children}</>;
}
