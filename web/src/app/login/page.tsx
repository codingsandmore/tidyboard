"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-store";
import { TB } from "@/lib/tokens";
import { Btn } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H } from "@/components/ui/heading";
import { useTranslations } from "next-intl";

/**
 * Sign-in landing page.
 *
 * Email/password and the home-rolled Google flow are gone — Cognito's Hosted
 * UI now drives signup, password auth, and Google federation. This page is
 * a single "Continue" CTA that redirects to Cognito; the user picks an
 * identity provider there and is bounced back to /auth/callback.
 */
export default function LoginPage() {
  const params = useSearchParams();
  const { signIn } = useAuth();
  const t = useTranslations("auth");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const returnTo = params.get("returnTo") ?? "/";

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      // signIn redirects the browser; resolution doesn't usually return.
      await signIn(returnTo);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Sign-in failed.";
      setError(msg);
      setLoading(false);
    }
  }

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
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div
          style={{
            fontFamily: TB.fontDisplay,
            fontSize: 28,
            fontWeight: 600,
            color: TB.primary,
            letterSpacing: "-0.02em",
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          tidyboard
        </div>

        <Card pad={28} elevated>
          <H as="h1" style={{ fontSize: 22, marginBottom: 6 }}>
            {t("signIn")}
          </H>
          <div style={{ fontSize: 13, color: TB.text2, marginBottom: 24 }}>
            {t("welcomeBack")}
          </div>

          {error && (
            <div
              role="alert"
              style={{
                background: TB.destructive + "14",
                border: `1px solid ${TB.destructive}`,
                borderRadius: TB.r.md,
                padding: "10px 14px",
                fontSize: 13,
                color: TB.destructive,
                marginBottom: 18,
              }}
            >
              {error}
            </div>
          )}

          <Btn
            kind="primary"
            size="xl"
            full
            disabled={loading}
            onClick={handleClick}
            style={{ marginBottom: 14 }}
          >
            {loading ? t("signingIn") : t("logIn")}
          </Btn>

          <div
            style={{
              fontSize: 12,
              color: TB.text2,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            You will be redirected to a secure sign-in page where you can use
            your Google account or your email address.
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: 13,
              color: TB.text2,
            }}
          >
            <a
              href="/pin-login"
              style={{ color: TB.accent, fontWeight: 600, textDecoration: "none" }}
            >
              Kiosk PIN login →
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
