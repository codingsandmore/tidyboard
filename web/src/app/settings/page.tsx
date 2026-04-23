"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { Settings } from "@/components/screens/equity";
import { useTheme, type Theme } from "@/components/theme-provider";
import { LocaleSwitcher } from "@/i18n/provider";
import { useAuth } from "@/lib/auth/auth-store";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/lib/api/use-subscription";
import { api } from "@/lib/api/client";
import { useWS } from "@/lib/ws/ws-provider";
import { isApiFallbackMode } from "@/lib/api/fallback";
import { useTranslations } from "next-intl";
import { AISettingsCard } from "./ai-section";
import { useCalendars, useAddICalCalendar } from "@/lib/api/hooks";

function AppearanceCard() {
  const { preference, setTheme } = useTheme();
  const t = useTranslations("settings");
  const THEME_OPTIONS: { value: Theme; label: string }[] = [
    { value: "light", label: t("light") },
    { value: "dark", label: t("dark") },
    { value: "system", label: t("system") },
  ];

  return (
    <div
      style={{
        padding: "12px 16px",
        background: TB.surface,
        borderBottom: `1px solid ${TB.border}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: TB.fontBody,
        fontSize: 13,
      }}
    >
      <span style={{ color: TB.text2, fontWeight: 500 }}>{t("appearance")}</span>
      <div
        style={{
          display: "inline-flex",
          padding: 3,
          background: TB.bg2,
          borderRadius: 8,
          gap: 2,
        }}
      >
        {THEME_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: preference === value ? 600 : 500,
              background: preference === value ? TB.surface : "transparent",
              color: preference === value ? TB.text : TB.text2,
              cursor: "pointer",
              border: "none",
              boxShadow:
                preference === value ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              fontFamily: TB.fontBody,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SignOutCard() {
  const { logout } = useAuth();
  const router = useRouter();
  const t = useTranslations("settings");

  function handleSignOut() {
    logout();
    router.push("/login");
  }

  return (
    <div
      style={{
        padding: "12px 16px",
        background: TB.surface,
        borderBottom: `1px solid ${TB.border}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: TB.fontBody,
        fontSize: 13,
      }}
    >
      <span style={{ color: TB.text2, fontWeight: 500, flex: 1 }}>{t("account")}</span>
      <button
        data-testid="logout-button"
        onClick={handleSignOut}
        style={{
          padding: "6px 14px",
          borderRadius: TB.r.md,
          border: `1px solid ${TB.destructive}`,
          background: "transparent",
          color: TB.destructive,
          cursor: "pointer",
          fontFamily: TB.fontBody,
          fontSize: 13,
          fontWeight: 550,
        }}
      >
        {t("signOut")}
      </button>
    </div>
  );
}

const STRIPE_ENABLED = process.env.NEXT_PUBLIC_STRIPE_ENABLED !== "false";

function BillingCard() {
  const { subscription, loading } = useSubscription();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [busy, setBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const isSubscribed =
    subscription?.status === "active" || subscription?.status === "trialing";

  async function handleUpgrade() {
    setBusy(true);
    setBillingError(null);
    try {
      const res = await api.post<{ url: string }>("/v1/billing/checkout", {});
      window.location.href = res.url;
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to start checkout";
      setBillingError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handlePortal() {
    setBusy(true);
    setBillingError(null);
    try {
      const res = await api.post<{ url: string }>("/v1/billing/portal", {});
      window.location.href = res.url;
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to open portal";
      setBillingError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        padding: "12px 16px",
        background: TB.surface,
        borderBottom: `1px solid ${TB.border}`,
        fontFamily: TB.fontBody,
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ color: TB.text2, fontWeight: 500, flex: 1 }}>{t("billing")}</span>
        {!STRIPE_ENABLED ? (
          <span style={{ color: TB.text2, fontSize: 12 }}>
            {t("selfHosted")} —{" "}
            <a
              href="https://tidyboard.dev/cloud"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: TB.primary, textDecoration: "none" }}
            >
              {t("noBillingNeeded")}
            </a>
          </span>
        ) : loading ? (
          <span style={{ color: TB.muted, fontSize: 12 }}>{tCommon("loading")}</span>
        ) : isSubscribed ? (
          <button
            onClick={handlePortal}
            disabled={busy}
            style={{
              padding: "6px 14px",
              borderRadius: TB.r.md,
              border: `1px solid ${TB.border}`,
              background: TB.surface,
              color: TB.text,
              cursor: busy ? "wait" : "pointer",
              fontFamily: TB.fontBody,
              fontSize: 13,
              fontWeight: 550,
            }}
          >
            {busy ? "…" : t("manageBilling")}
          </button>
        ) : (
          <button
            onClick={handleUpgrade}
            disabled={busy}
            style={{
              padding: "6px 14px",
              borderRadius: TB.r.md,
              border: "none",
              background: TB.primary,
              color: TB.primaryFg,
              cursor: busy ? "wait" : "pointer",
              fontFamily: TB.fontBody,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {busy ? "…" : t("upgradeToCloud")}
          </button>
        )}
      </div>
      {billingError && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: TB.destructive,
          }}
        >
          {billingError}
        </div>
      )}
    </div>
  );
}

function ConnectionCard() {
  const { status } = useWS();
  const t = useTranslations("settings");

  // Hidden in fallback/demo mode — no backend to connect to
  if (isApiFallbackMode()) return null;

  type Dot = { color: string; label: string };
  const dot: Dot =
    status === "open"
      ? { color: TB.success, label: t("liveConnected") }
      : status === "connecting"
        ? { color: TB.warning, label: t("reconnecting") }
        : { color: TB.destructive, label: t("offlineRefresh") };

  return (
    <div
      style={{
        padding: "12px 16px",
        background: TB.surface,
        borderBottom: `1px solid ${TB.border}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: TB.fontBody,
        fontSize: 13,
      }}
    >
      <span style={{ color: TB.text2, fontWeight: 500 }}>{t("connection")}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          data-testid="ws-status-dot"
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dot.color,
            flexShrink: 0,
          }}
        />
        <span style={{ color: TB.text2, fontSize: 12 }}>{dot.label}</span>
      </div>
    </div>
  );
}

function LanguageCard() {
  const t = useTranslations("settings");
  return (
    <div
      style={{
        padding: "12px 16px",
        background: TB.surface,
        borderBottom: `1px solid ${TB.border}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: TB.fontBody,
        fontSize: 13,
      }}
    >
      <span style={{ color: TB.text2, fontWeight: 500 }}>{t("language")}</span>
      <LocaleSwitcher />
    </div>
  );
}

function AuditLogCard() {
  const { member } = useAuth();
  const t = useTranslations("admin.audit");
  const tCommon = useTranslations("common");

  // Only show for adult (admin) members
  if (member?.role !== "adult") return null;

  return (
    <div
      style={{
        padding: "12px 16px",
        background: TB.surface,
        borderBottom: `1px solid ${TB.border}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: TB.fontBody,
        fontSize: 13,
      }}
    >
      <span style={{ color: TB.text2, fontWeight: 500, flex: 1 }}>{t("title")}</span>
      <a
        href="/admin/audit"
        style={{
          padding: "6px 14px",
          borderRadius: TB.r.md,
          border: `1px solid ${TB.border}`,
          background: TB.surface,
          color: TB.text,
          cursor: "pointer",
          fontFamily: TB.fontBody,
          fontSize: 13,
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        {tCommon("home").replace("← ", "")} →
      </a>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = {
  google: "Google",
  ical_url: "iCal",
  caldav: "CalDAV",
  local: "Local",
};

function CalendarsCard() {
  const { data: calendars, isLoading } = useCalendars();
  const addICal = useAddICalCalendar();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !url.trim()) {
      setFormError("Name and URL are required.");
      return;
    }
    try {
      await addICal.mutateAsync({ name: name.trim(), url: url.trim() });
      setName("");
      setUrl("");
      setShowForm(false);
    } catch {
      setFormError("Failed to add calendar. Check the URL and try again.");
    }
  }

  return (
    <div
      style={{
        padding: "12px 16px",
        background: TB.surface,
        borderBottom: `1px solid ${TB.border}`,
        fontFamily: TB.fontBody,
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <span style={{ color: TB.text2, fontWeight: 500, flex: 1 }}>Calendars</span>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: "5px 12px",
            borderRadius: TB.r.md,
            border: `1px solid ${TB.border}`,
            background: TB.surface,
            color: TB.primary,
            cursor: "pointer",
            fontFamily: TB.fontBody,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          + Add iCal URL
        </button>
        <a
          href="/v1/auth/oauth/google/start"
          style={{
            padding: "5px 12px",
            borderRadius: TB.r.md,
            border: `1px solid ${TB.border}`,
            background: TB.surface,
            color: TB.text,
            cursor: "pointer",
            fontFamily: TB.fontBody,
            fontSize: 12,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          + Connect Google Calendar
        </a>
      </div>

      {isLoading && (
        <div style={{ color: TB.muted, fontSize: 12 }}>Loading calendars…</div>
      )}

      {!isLoading && calendars && calendars.length === 0 && (
        <div style={{ color: TB.muted, fontSize: 12 }}>No calendars connected yet.</div>
      )}

      {calendars && calendars.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {calendars.map((cal) => (
            <div
              key={cal.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 10px",
                background: TB.bg2,
                borderRadius: TB.r.md,
              }}
            >
              <span style={{ flex: 1, fontWeight: 500 }}>{cal.name}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 9999,
                  background: TB.primary + "18",
                  color: TB.primary,
                }}
              >
                {KIND_LABEL[cal.kind] ?? cal.kind}
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <input
            type="text"
            placeholder="Calendar name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: TB.r.md,
              border: `1px solid ${TB.border}`,
              fontFamily: TB.fontBody,
              fontSize: 13,
              background: TB.bg,
              color: TB.text,
            }}
          />
          <input
            type="url"
            placeholder="https://example.com/calendar.ics"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: TB.r.md,
              border: `1px solid ${TB.border}`,
              fontFamily: TB.fontBody,
              fontSize: 13,
              background: TB.bg,
              color: TB.text,
            }}
          />
          {formError && (
            <div style={{ fontSize: 12, color: TB.destructive }}>{formError}</div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={addICal.isPending}
              style={{
                padding: "6px 14px",
                borderRadius: TB.r.md,
                border: "none",
                background: TB.primary,
                color: TB.primaryFg,
                cursor: addICal.isPending ? "wait" : "pointer",
                fontFamily: TB.fontBody,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {addICal.isPending ? "Adding…" : "Add Calendar"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); }}
              style={{
                padding: "6px 14px",
                borderRadius: TB.r.md,
                border: `1px solid ${TB.border}`,
                background: "transparent",
                color: TB.text2,
                cursor: "pointer",
                fontFamily: TB.fontBody,
                fontSize: 13,
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const tCommon = useTranslations("common");
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: TB.bg,
      }}
    >
      <div
        style={{
          padding: "8px 16px",
          background: TB.surface,
          borderBottom: `1px solid ${TB.border}`,
          display: "flex",
          alignItems: "center",
          fontFamily: TB.fontBody,
          fontSize: 13,
        }}
      >
        <a
          href="/"
          style={{
            color: TB.text2,
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${TB.border}`,
          }}
        >
          {tCommon("home")}
        </a>
      </div>

      <AppearanceCard />
      <LanguageCard />
      <ConnectionCard />
      <CalendarsCard />
      <BillingCard />
      <AISettingsCard />
      <AuditLogCard />
      <SignOutCard />

      <div style={{ flex: 1, overflow: "hidden" }}>
        <Settings />
      </div>
    </div>
  );
}
