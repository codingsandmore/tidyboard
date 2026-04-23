"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-store";
import { TB } from "@/lib/tokens";
import { Btn } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H } from "@/components/ui/heading";
import { useTranslations } from "next-intl";

// Styled native input that matches the app's Input component visuals
function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{ display: "block", fontSize: 13, fontWeight: 550, marginBottom: 6 }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: "100%",
          height: 44,
          padding: "0 12px",
          fontFamily: TB.fontBody,
          fontSize: 14,
          color: TB.text,
          background: TB.surface,
          border: `1px solid ${TB.border}`,
          borderRadius: TB.r.sm,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const t = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
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
        {/* Logo */}
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

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field
              id="email"
              label={t("email")}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <Field
              id="password"
              label={t("password")}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={t("yourPassword")}
              autoComplete="current-password"
            />

            <Btn
              kind="primary"
              size="xl"
              full
              disabled={loading}
              style={{ marginTop: 6 }}
            >
              {loading ? t("signingIn") : t("logIn")}
            </Btn>
          </form>

          <div
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: 13,
              color: TB.text2,
            }}
          >
            {t("noAccount")}{" "}
            <a
              href="/onboarding"
              style={{ color: TB.accent, fontWeight: 600, textDecoration: "none" }}
            >
              {t("createOne")}
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
