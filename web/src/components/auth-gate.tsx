"use client";

/**
 * AuthGate — protects routes that require authentication.
 *
 * - status === 'loading'         → renders a loading skeleton
 * - status === 'unauthenticated' → redirects to /login
 * - status === 'authenticated'   → renders children
 */

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-store";
import { TB } from "@/lib/tokens";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

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

  return <>{children}</>;
}
