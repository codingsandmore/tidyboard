"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-store";
import { handleCallback, readOIDCConfig } from "@/lib/auth/oidc";
import { TB } from "@/lib/tokens";
import { Card } from "@/components/ui/card";

/**
 * /auth/callback — Cognito redirects here after the user signs in via the
 * Hosted UI. We swap the authorization code for tokens, hand the id_token
 * to the auth context, and bounce to the page the user was trying to reach
 * (or "/" by default).
 *
 * Errors during exchange (state mismatch, expired session, network) drop the
 * user back at /login with an error query.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { acceptToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cfg = readOIDCConfig();
    if (!cfg) {
      setError("Cognito is not configured for this build.");
      return;
    }

    handleCallback(cfg)
      .then(async (res) => {
        if (cancelled) return;
        await acceptToken(res.idToken);
        if (cancelled) return;
        router.replace(res.returnTo);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Sign-in could not be completed.";
        setError(msg);
        // Drop back to /login after a beat so the user sees the error.
        setTimeout(() => {
          if (!cancelled) router.replace("/login");
        }, 1500);
      });

    return () => {
      cancelled = true;
    };
  }, [acceptToken, router]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: TB.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: TB.fontBody,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        <Card pad={24} elevated>
          {error ? (
            <>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: TB.destructive,
                  marginBottom: 8,
                }}
              >
                Sign-in failed
              </div>
              <div style={{ fontSize: 13, color: TB.text2 }}>{error}</div>
              <div style={{ fontSize: 12, color: TB.text2, marginTop: 12 }}>
                Returning you to the sign-in page…
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: 14,
                color: TB.text2,
                textAlign: "center",
              }}
            >
              Signing you in…
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
