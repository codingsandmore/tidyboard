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
import { InviteModal } from "./invite-modal";
import {
  useCalendars,
  useAddICalCalendar,
  useMembers,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  useHousehold,
  useUpdateHouseholdSettings,
  useUpdateMemberNotify,
  useTestNotification,
  type NotifyPreferences,
} from "@/lib/api/hooks";

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

const COLOR_OPTIONS = [
  "#3B82F6", "#EF4444", "#22C55E", "#F59E0B", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "child", label: "Child" },
  { value: "guest", label: "Guest" },
];

const AGE_OPTIONS = [
  { value: "toddler", label: "Toddler" },
  { value: "child", label: "Child" },
  { value: "tween", label: "Tween" },
  { value: "teen", label: "Teen" },
  { value: "adult", label: "Adult" },
];

interface MemberFormState {
  name: string;
  displayName: string;
  color: string;
  role: string;
  ageGroup: string;
  pin: string;
}

const EMPTY_FORM: MemberFormState = {
  name: "",
  displayName: "",
  color: COLOR_OPTIONS[0],
  role: "member",
  ageGroup: "adult",
  pin: "",
};

function FamilyCard() {
  const { household } = useAuth();
  const { data: members, isLoading } = useMembers();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const [showAdd, setShowAdd] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditingId(null);
    setShowAdd(true);
  }

  function openEdit(m: { id: string; name: string; display_name?: string; color: string; role: string; age_group?: string }) {
    setForm({
      name: m.name,
      displayName: m.display_name ?? m.name,
      color: m.color,
      role: m.role,
      ageGroup: m.age_group ?? "adult",
      pin: "",
    });
    setFormError(null);
    setEditingId(m.id);
    setShowAdd(true);
  }

  function cancelForm() {
    setShowAdd(false);
    setEditingId(null);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.displayName.trim()) { setFormError("Display name is required."); return; }
    if (!household?.id) { setFormError("No household found — try refreshing."); return; }
    if (form.pin && !/^\d{4,6}$/.test(form.pin)) { setFormError("PIN must be 4-6 digits."); return; }

    try {
      if (editingId) {
        await updateMember.mutateAsync({
          householdId: household.id,
          memberId: editingId,
          name: form.name.trim(),
          displayName: form.displayName.trim(),
          color: form.color,
          role: form.role,
          ageGroup: form.ageGroup,
          ...(form.pin ? { pin: form.pin } : {}),
        });
      } else {
        await createMember.mutateAsync({
          householdId: household.id,
          name: form.name.trim(),
          displayName: form.displayName.trim(),
          color: form.color,
          role: form.role,
          ageGroup: form.ageGroup,
          ...(form.pin ? { pin: form.pin } : {}),
        });
      }
      cancelForm();
    } catch {
      setFormError(editingId ? "Failed to update member." : "Failed to add member.");
    }
  }

  async function handleDelete(memberId: string) {
    if (!household?.id) return;
    try {
      await deleteMember.mutateAsync({ householdId: household.id, memberId });
    } catch {
      // silent — member list will not update
    }
  }

  const inputStyle = {
    padding: "6px 10px",
    borderRadius: TB.r.md,
    border: `1px solid ${TB.border}`,
    fontFamily: TB.fontBody,
    fontSize: 13,
    background: TB.bg,
    color: TB.text,
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const isPending = createMember.isPending || updateMember.isPending;

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
      {showInvite && household?.id && (
        <InviteModal householdId={household.id} onClose={() => setShowInvite(false)} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <span style={{ color: TB.text2, fontWeight: 500, flex: 1 }}>Family Members</span>
        <button
          data-testid="invite-partner-btn"
          onClick={() => setShowInvite(true)}
          style={{
            padding: "5px 12px",
            borderRadius: TB.r.md,
            border: `1px solid ${TB.border}`,
            background: TB.surface,
            color: TB.text2,
            cursor: "pointer",
            fontFamily: TB.fontBody,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          Invite a partner
        </button>
        <button
          data-testid="add-member-btn"
          onClick={openAdd}
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
          + Add Member
        </button>
      </div>

      {isLoading && <div style={{ color: TB.muted, fontSize: 12 }}>Loading…</div>}

      {!isLoading && members && members.length === 0 && (
        <div style={{ color: TB.muted, fontSize: 12 }}>No members yet.</div>
      )}

      {members && members.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(members as Array<{ id: string; name: string; display_name?: string; color: string; role: string; age_group?: string }>).map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 10px",
                background: TB.bg2,
                borderRadius: TB.r.md,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: m.color,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {(m.display_name ?? m.name).charAt(0).toUpperCase()}
              </div>
              <span style={{ flex: 1, fontWeight: 500 }}>{m.display_name ?? m.name}</span>
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
                {m.role}
              </span>
              <button
                data-testid={`edit-member-${m.id}`}
                onClick={() => openEdit(m)}
                style={{
                  padding: "3px 8px",
                  borderRadius: TB.r.md,
                  border: `1px solid ${TB.border}`,
                  background: "transparent",
                  color: TB.text2,
                  cursor: "pointer",
                  fontFamily: TB.fontBody,
                  fontSize: 11,
                }}
              >
                Edit
              </button>
              <button
                data-testid={`delete-member-${m.id}`}
                onClick={() => handleDelete(m.id)}
                style={{
                  padding: "3px 8px",
                  borderRadius: TB.r.md,
                  border: `1px solid ${TB.destructive}`,
                  background: "transparent",
                  color: TB.destructive,
                  cursor: "pointer",
                  fontFamily: TB.fontBody,
                  fontSize: 11,
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <form
          data-testid="member-form"
          onSubmit={handleSubmit}
          style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <input
            type="text"
            placeholder="Full name (e.g. Jackson Smith)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Display name (e.g. Jackson)"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              style={{ ...inputStyle, flex: 1 }}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={form.ageGroup}
              onChange={(e) => setForm((f) => ({ ...f, ageGroup: e.target.value }))}
              style={{ ...inputStyle, flex: 1 }}
            >
              {AGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TB.text2, marginBottom: 4 }}>Color</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: c,
                    border: form.color === c ? `3px solid ${TB.text}` : "2px solid transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="PIN (4-6 digits, optional)"
            value={form.pin}
            onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
            style={inputStyle}
          />
          {formError && (
            <div style={{ fontSize: 12, color: TB.destructive }}>{formError}</div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={isPending}
              data-testid="member-form-submit"
              style={{
                padding: "6px 14px",
                borderRadius: TB.r.md,
                border: "none",
                background: TB.primary,
                color: TB.primaryFg,
                cursor: isPending ? "wait" : "pointer",
                fontFamily: TB.fontBody,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {isPending ? "Saving…" : editingId ? "Save Changes" : "Add Member"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
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

function KioskModeCard() {
  const { household } = useAuth();
  const { data: hh, isLoading } = useHousehold(household?.id);
  const updateSettings = useUpdateHouseholdSettings();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const enabled =
    optimistic !== null
      ? optimistic
      : (hh?.settings?.kiosk_mode_enabled ?? false);

  async function handleToggle() {
    if (!household?.id) return;
    const next = !enabled;
    setOptimistic(next);
    try {
      await updateSettings.mutateAsync({
        householdId: household.id,
        settings: { ...hh?.settings, kiosk_mode_enabled: next },
      });
    } catch {
      setOptimistic(null);
    }
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
      <div style={{ flex: 1 }}>
        <div style={{ color: TB.text2, fontWeight: 500 }}>Kiosk Mode</div>
        <div style={{ color: TB.muted, fontSize: 11, marginTop: 2 }}>
          When on, the app starts at the lock screen. Any family member can
          claim the session with their PIN.
        </div>
      </div>
      {isLoading ? (
        <span style={{ color: TB.muted, fontSize: 12 }}>Loading…</span>
      ) : (
        <button
          data-testid="kiosk-mode-toggle"
          onClick={handleToggle}
          disabled={updateSettings.isPending}
          aria-pressed={enabled}
          style={{
            width: 44,
            height: 24,
            borderRadius: 9999,
            background: enabled ? TB.primary : TB.bg2,
            border: `1px solid ${enabled ? TB.primary : TB.border}`,
            position: "relative",
            cursor: updateSettings.isPending ? "wait" : "pointer",
            transition: "background 0.2s, border-color 0.2s",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: enabled ? 22 : 2,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              transition: "left 0.2s",
            }}
          />
        </button>
      )}
    </div>
  );
}

// ── NotificationsCard ──────────────────────────────────────────────────────

interface NotificationMemberRowProps {
  member: { id: string; name: string; display_name?: string; color: string; ntfy_topic?: string | null; notification_preferences?: NotifyPreferences | null };
}

function NotificationMemberRow({ member }: NotificationMemberRowProps) {
  const defaultPrefs: NotifyPreferences = {
    events_enabled: member.notification_preferences?.events_enabled ?? false,
    lists_enabled: member.notification_preferences?.lists_enabled ?? false,
    tasks_enabled: member.notification_preferences?.tasks_enabled ?? false,
  };

  const [topic, setTopic] = useState(member.ntfy_topic ?? "");
  const [prefs, setPrefs] = useState<NotifyPreferences>(defaultPrefs);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const updateNotify = useUpdateMemberNotify(member.id);
  const testNotify = useTestNotification(member.id);

  const inputStyle = {
    padding: "5px 8px",
    borderRadius: TB.r.md,
    border: `1px solid ${TB.border}`,
    fontFamily: TB.fontBody,
    fontSize: 12,
    background: TB.bg,
    color: TB.text,
    width: "100%",
    boxSizing: "border-box" as const,
  };

  async function handleSave() {
    await updateNotify.mutateAsync({
      ntfyTopic: topic.trim() || undefined,
      preferences: prefs,
    });
  }

  async function handleTest() {
    setTestStatus(null);
    try {
      await testNotify.mutateAsync();
      setTestStatus("Sent!");
    } catch {
      setTestStatus("Failed — check topic.");
    }
  }

  const displayName = member.display_name ?? member.name;

  return (
    <div
      style={{
        padding: "10px 12px",
        background: TB.bg2,
        borderRadius: TB.r.md,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: member.color,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontWeight: 500, fontSize: 12 }}>{displayName}</span>
      </div>

      <div>
        <div style={{ fontSize: 11, color: TB.text2, marginBottom: 3 }}>ntfy topic</div>
        <input
          data-testid={`ntfy-topic-${member.id}`}
          type="text"
          placeholder="e.g. tidyboard-smith-family-8x2k"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={inputStyle}
        />
        <div style={{ fontSize: 10, color: TB.muted, marginTop: 2 }}>
          Choose a hard-to-guess topic name — anyone with it can read your notifications.
        </div>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {(
          [
            { key: "events_enabled", label: "Events" },
            { key: "lists_enabled", label: "Lists" },
            { key: "tasks_enabled", label: "Tasks" },
          ] as { key: keyof NotifyPreferences; label: string }[]
        ).map(({ key, label }) => (
          <label
            key={key}
            style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12 }}
          >
            <input
              data-testid={`pref-${key}-${member.id}`}
              type="checkbox"
              checked={prefs[key]}
              onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          data-testid={`save-notify-${member.id}`}
          onClick={handleSave}
          disabled={updateNotify.isPending}
          style={{
            padding: "5px 12px",
            borderRadius: TB.r.md,
            border: "none",
            background: TB.primary,
            color: TB.primaryFg,
            cursor: updateNotify.isPending ? "wait" : "pointer",
            fontFamily: TB.fontBody,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {updateNotify.isPending ? "Saving…" : "Save"}
        </button>
        <button
          data-testid={`test-notify-${member.id}`}
          onClick={handleTest}
          disabled={testNotify.isPending || !topic.trim()}
          style={{
            padding: "5px 12px",
            borderRadius: TB.r.md,
            border: `1px solid ${TB.border}`,
            background: "transparent",
            color: TB.text2,
            cursor: testNotify.isPending || !topic.trim() ? "default" : "pointer",
            fontFamily: TB.fontBody,
            fontSize: 12,
          }}
        >
          {testNotify.isPending ? "Sending…" : "Send test"}
        </button>
        {testStatus && (
          <span style={{ fontSize: 11, color: testStatus === "Sent!" ? TB.success : TB.destructive }}>
            {testStatus}
          </span>
        )}
      </div>
    </div>
  );
}

function NotificationsCard() {
  const { data: members, isLoading } = useMembers();

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
      <div style={{ color: TB.text2, fontWeight: 500, marginBottom: 8 }}>
        Notifications (ntfy.sh)
      </div>
      <div style={{ fontSize: 11, color: TB.muted, marginBottom: 10 }}>
        Install the <strong>ntfy</strong> app on your phone, subscribe to your topic, and enter it here.
        Pick a non-obvious topic — it&apos;s your notification password.
      </div>

      {isLoading && <div style={{ color: TB.muted, fontSize: 12 }}>Loading…</div>}

      {!isLoading && members && members.length === 0 && (
        <div style={{ color: TB.muted, fontSize: 12 }}>No members yet.</div>
      )}

      {members && members.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(members as Array<{
            id: string;
            name: string;
            display_name?: string;
            color: string;
            ntfy_topic?: string | null;
            notification_preferences?: NotifyPreferences | null;
          }>).map((m) => (
            <NotificationMemberRow key={m.id} member={m} />
          ))}
        </div>
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
      <KioskModeCard />
      <NotificationsCard />
      <FamilyCard />
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
