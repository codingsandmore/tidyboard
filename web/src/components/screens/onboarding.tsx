"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import { Btn } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { H } from "@/components/ui/heading";
import { FamilyShapes } from "@/components/ui/family-shapes";
import { useTranslations } from "next-intl";
import { useAddICalCalendar } from "@/lib/api/hooks";

const ObShell = ({
  children,
  footer,
  pad = 24,
}: {
  children: ReactNode;
  footer?: ReactNode;
  pad?: number;
}) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background: TB.bg,
      display: "flex",
      flexDirection: "column",
      fontFamily: TB.fontBody,
      color: TB.text,
      boxSizing: "border-box",
    }}
  >
    <div style={{ flex: 1, overflow: "auto", padding: pad }}>{children}</div>
    {footer && (
      <div
        style={{
          padding: `16px ${pad}px ${pad}px`,
          borderTop: `1px solid ${TB.borderSoft}`,
          background: TB.surface,
        }}
      >
        {footer}
      </div>
    )}
  </div>
);

const Logo = ({ size = 30, color = TB.primary }: { size?: number; color?: string }) => (
  <div
    style={{
      fontFamily: TB.fontDisplay,
      fontSize: size,
      fontWeight: 600,
      color,
      letterSpacing: "-0.02em",
      lineHeight: 1,
    }}
  >
    tidyboard
  </div>
);

const StepDots = ({ i, total = 7 }: { i: number; total?: number }) => (
  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
    {Array.from({ length: total }).map((_, k) => (
      <div
        key={k}
        style={{
          width: k === i ? 20 : 6,
          height: 6,
          borderRadius: 9999,
          background: k <= i ? TB.primary : TB.border,
          transition: "width .2s, background .2s",
        }}
      />
    ))}
  </div>
);

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div>
    <div style={{ fontSize: 13, fontWeight: 550, marginBottom: 6 }}>{label}</div>
    {children}
    {hint && (
      <div style={{ fontSize: 12, color: TB.text2, marginTop: 6 }}>{hint}</div>
    )}
  </div>
);

const Divider = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      color: TB.text2,
      fontSize: 12,
      margin: "6px 0",
    }}
  >
    <div style={{ flex: 1, height: 1, background: TB.border }} />
    {children}
    <div style={{ flex: 1, height: 1, background: TB.border }} />
  </div>
);

const ObWelcome = () => {
  const t = useTranslations("onboarding.welcome");
  const tApp = useTranslations("app");
  return (
    <ObShell
      footer={
        <div>
          <Btn kind="primary" size="xl" full>
            {t("cta")}
          </Btn>
          <div
            style={{
              textAlign: "center",
              marginTop: 14,
              fontSize: 13,
              color: TB.text2,
            }}
          >
            {t("signIn").split("?")[0]}?{" "}
            <span style={{ color: TB.accent, fontWeight: 600 }}>{t("signIn").split("? ")[1]}</span>
          </div>
        </div>
      }
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          paddingTop: 40,
        }}
      >
        <Logo size={38} />
        <FamilyShapes size={280} />
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <H as="h2" style={{ marginBottom: 10, fontSize: 28 }}>
            {t("greeting")}
          </H>
          <div style={{ color: TB.text2, fontSize: 16, lineHeight: 1.5 }}>
            {tApp("tagline")}
          </div>
        </div>
      </div>
    </ObShell>
  );
};

const ObCreate = () => {
  const t = useTranslations("onboarding.create");
  return (
    <ObShell
      footer={
        <>
          <Btn kind="primary" size="xl" full>
            {t("createAccount")}
          </Btn>
          <div
            style={{
              textAlign: "center",
              marginTop: 14,
              fontSize: 13,
              color: TB.text2,
            }}
          >
            {t("alreadyHaveAccount")}{" "}
            <span style={{ color: TB.accent, fontWeight: 600 }}>{t("signIn")}</span>
          </div>
        </>
      }
    >
      <div style={{ marginBottom: 28, marginTop: 8 }}>
        <Logo size={22} />
        <H as="h2" style={{ marginTop: 20, fontSize: 26 }}>
          {t("title")}
        </H>
        <div style={{ color: TB.text2, fontSize: 14, marginTop: 6 }}>
          {t("subtitle")}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            padding: 16,
            border: `1px solid ${TB.border}`,
            borderRadius: TB.r.md,
            background: TB.surface,
            color: TB.text2,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          Your Tidyboard account is ready. Continue to create the household that will own this dashboard.
        </div>
      </div>
    </ObShell>
  );
};

const ObHousehold = ({
  householdName,
  setHouseholdName,
  timezone,
  setTimezone,
}: {
  householdName: string;
  setHouseholdName: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
}) => {
  const t = useTranslations("onboarding.household");
  return (
    <ObShell
      footer={
        <Btn kind="primary" size="xl" full iconRight="arrowR">
          {t("continue")}
        </Btn>
      }
    >
      <div style={{ marginBottom: 32, marginTop: 8 }}>
        <StepDots i={2} />
        <H as="h2" style={{ marginTop: 28, fontSize: 28, textAlign: "center" }}>
          {t("title")}
        </H>
        <div
          style={{
            color: TB.text2,
            fontSize: 14,
            marginTop: 10,
            textAlign: "center",
            maxWidth: 300,
            margin: "10px auto 0",
          }}
        >
          {t("subtitle")}
        </div>
      </div>
      <div style={{ padding: "20px 0" }}>
        <Input
          value={householdName}
          onChange={setHouseholdName}
          placeholder="e.g. Our household"
          style={{
            height: 56,
            fontSize: 20,
            textAlign: "center",
            fontFamily: TB.fontDisplay,
            fontWeight: 500,
          }}
        />
        <div style={{ marginTop: 18 }}>
          <Field label="Timezone" hint="Used for routines, calendar days, and shopping windows.">
            <Input
              ariaLabel="Household timezone"
              value={timezone}
              onChange={setTimezone}
              placeholder="America/Los_Angeles"
            />
          </Field>
        </div>
      </div>
    </ObShell>
  );
};

const ObSelf = ({
  selfName,
  setSelfName,
  selfDisplayName,
  setSelfDisplayName,
  selfColor,
  setSelfColor,
}: {
  selfName: string;
  setSelfName: (v: string) => void;
  selfDisplayName: string;
  setSelfDisplayName: (v: string) => void;
  selfColor: string;
  setSelfColor: (v: string) => void;
}) => {
  const t = useTranslations("onboarding.self");
  const colors = TB.memberColors;
  const initial = selfName.trim()[0]?.toUpperCase() ?? "?";
  return (
    <ObShell
      footer={
        <Btn kind="primary" size="xl" full iconRight="arrowR">
          {t("continue")}
        </Btn>
      }
    >
      <StepDots i={3} />
      <H as="h2" style={{ marginTop: 24, fontSize: 26, textAlign: "center" }}>
        {t("title")}
      </H>

      <div style={{ display: "flex", justifyContent: "center", margin: "28px 0 20px" }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: selfColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: TB.fontBody,
              color: "#fff",
              fontSize: 42,
              fontWeight: 600,
            }}
          >
            {initial}
          </div>
          <div
            style={{
              position: "absolute",
              right: -4,
              bottom: -4,
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: TB.surface,
              border: `2px solid ${TB.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="camera" size={16} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label={t("fullName")}>
          <Input value={selfName} onChange={setSelfName} placeholder="Your full name" />
        </Field>
        <Field label={t("displayName")} hint={t("displayNameHint")}>
          <Input value={selfDisplayName} onChange={setSelfDisplayName} placeholder="e.g. Mom, Dad, Alex" />
        </Field>
        <Field label={t("color")} hint={t("colorHint")}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 10,
              marginTop: 6,
            }}
          >
            {colors.map((c, i) => (
              <div
                key={i}
                onClick={() => setSelfColor(c)}
                style={{
                  aspectRatio: "1",
                  borderRadius: "50%",
                  background: c,
                  cursor: "pointer",
                  boxShadow:
                    selfColor === c ? `0 0 0 3px ${TB.surface}, 0 0 0 5px ${c}` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "transform .1s",
                }}
              >
                {selfColor === c && <Icon name="check" size={18} color="#fff" stroke={2.5} />}
              </div>
            ))}
          </div>
        </Field>
      </div>
    </ObShell>
  );
};

export type FamilyRole = "adult" | "child" | "pet";

export interface FamilyMemberDraft {
  id: string;
  name: string;
  display_name: string;
  role: FamilyRole;
  color: string;
  age_group: "adult" | "child" | "pet";
  pin?: string;
}

const roleLabels: Record<FamilyRole, string> = {
  adult: "Adult",
  child: "Child",
  pet: "Pet",
};

const ObFamily = ({
  members,
  draft,
  setDraft,
  addDraft,
  removeDraft,
  rosterReviewed,
  setRosterReviewed,
}: {
  members: FamilyMemberDraft[];
  draft: Omit<FamilyMemberDraft, "id" | "color">;
  setDraft: (draft: Omit<FamilyMemberDraft, "id" | "color">) => void;
  addDraft: () => void;
  removeDraft: (id: string) => void;
  rosterReviewed: boolean;
  setRosterReviewed: (checked: boolean) => void;
}) => {
  const t = useTranslations("onboarding.family");
  return (
    <ObShell
      footer={
        <Btn kind="primary" size="xl" full iconRight="arrowR">
          {t("continue")}
        </Btn>
      }
    >
      <StepDots i={4} />
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginTop: 24,
        }}
      >
        <H as="h2" style={{ fontSize: 26 }}>
          {t("title")}
        </H>
        <Badge>{members.length} added</Badge>
      </div>
      <div style={{ color: TB.text2, fontSize: 13, marginTop: 4, marginBottom: 18 }}>
        {t("subtitle")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {members.map((m) => (
          <Card
            key={m.id}
            pad={12}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: m.color,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 17,
              }}
            >
              {m.name.trim()[0]?.toUpperCase() ?? "?"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 550, fontSize: 15 }}>{m.display_name || m.name}</div>
              <div
                style={{
                  fontSize: 12,
                  color: TB.text2,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span>{roleLabels[m.role]}</span>
                {m.pin && <span style={{ fontFamily: TB.fontMono }}>PIN {m.pin}</span>}
              </div>
            </div>
            <button
              type="button"
              aria-label={`Remove ${m.name}`}
              onClick={() => removeDraft(m.id)}
              style={{
                background: "transparent",
                border: "none",
                color: TB.text2,
                cursor: "pointer",
                padding: 6,
              }}
            >
              <Icon name="trash" size={16} />
            </button>
          </Card>
        ))}

        <Card pad={12} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Name">
            <Input
              ariaLabel="Family member name"
              value={draft.name}
              onChange={(name) => setDraft({ ...draft, name, display_name: draft.display_name || name })}
              placeholder="Name"
            />
          </Field>
          <Field label="Role">
            <select
              aria-label="Family member role"
              value={draft.role}
              onChange={(e) => {
                const role = e.target.value as FamilyRole;
                setDraft({
                  ...draft,
                  role,
                  age_group: role === "pet" ? "pet" : role === "child" ? "child" : "adult",
                  pin: role === "child" ? draft.pin : undefined,
                });
              }}
              style={{
                width: "100%",
                height: 44,
                border: `1px solid ${TB.border}`,
                borderRadius: TB.r.sm,
                background: TB.surface,
                color: TB.text,
                fontFamily: TB.fontBody,
                fontSize: 14,
                padding: "0 12px",
              }}
            >
              <option value="adult">Adult</option>
              <option value="child">Child</option>
              <option value="pet">Pet</option>
            </select>
          </Field>
          {draft.role === "child" && (
            <Field label="PIN" hint="Optional 4-6 digit kiosk unlock code.">
              <Input
                ariaLabel="Optional child PIN"
                value={draft.pin ?? ""}
                onChange={(pin) => setDraft({ ...draft, pin })}
                placeholder="1234"
              />
            </Field>
          )}
          <button
            type="button"
            onClick={addDraft}
            style={{
              padding: "14px 12px",
              background: TB.surface,
              border: `1.5px dashed ${TB.border}`,
              borderRadius: TB.r.lg,
              cursor: "pointer",
              color: TB.primary,
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: TB.fontBody,
            }}
          >
            <Icon name="plus" size={18} /> {t("addMember")}
          </button>
        </Card>
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={{ display: "flex", gap: 10, fontSize: 13, color: TB.text2, lineHeight: 1.4 }}>
          <input
            type="checkbox"
            checked={rosterReviewed}
            onChange={(e) => setRosterReviewed(e.target.checked)}
          />
          My roster includes everyone who should appear on Tidyboard.
        </label>
      </div>
    </ObShell>
  );
};

const ObCalendar = () => {
  const t = useTranslations("onboarding.calendar");
  const addICal = useAddICalCalendar();
  const [showICalForm, setShowICalForm] = useState(false);
  const [icalName, setIcalName] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [icalError, setIcalError] = useState<string | null>(null);
  const [icalSuccess, setIcalSuccess] = useState(false);

  async function handleICalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIcalError(null);
    if (!icalName.trim() || !icalUrl.trim()) {
      setIcalError("Name and URL are required.");
      return;
    }
    try {
      await addICal.mutateAsync({ name: icalName.trim(), url: icalUrl.trim() });
      setIcalSuccess(true);
      setShowICalForm(false);
    } catch {
      setIcalError("Failed to add calendar. Check the URL and try again.");
    }
  }

  return (
    <ObShell
      footer={
        <>
          <Btn
            kind="primary"
            size="xl"
            full
            icon="google"
            style={{ background: "#fff", color: TB.text, border: `1px solid ${TB.border}` }}
          >
            {t("connectGoogle")}
          </Btn>
          {showICalForm ? (
            <form
              onSubmit={handleICalSubmit}
              style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}
            >
              <Input
                value={icalName}
                onChange={(v) => setIcalName(v)}
                placeholder="Calendar name"
              />
              <Input
                value={icalUrl}
                onChange={(v) => setIcalUrl(v)}
                placeholder="https://example.com/calendar.ics"
              />
              {icalError && (
                <div style={{ fontSize: 12, color: TB.destructive }}>{icalError}</div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn kind="primary" size="lg" full style={{ flex: 1 }}>
                  {addICal.isPending ? "Adding…" : "Add Calendar"}
                </Btn>
                <Btn
                  kind="secondary"
                  size="lg"
                  style={{ flex: 0 }}
                  onClick={() => { setShowICalForm(false); setIcalError(null); }}
                >
                  Cancel
                </Btn>
              </div>
            </form>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 20,
                marginTop: 14,
                fontSize: 13,
              }}
            >
              {icalSuccess ? (
                <span style={{ color: TB.success, fontWeight: 600 }}>iCal calendar added!</span>
              ) : (
                <span
                  style={{ color: TB.accent, fontWeight: 600, cursor: "pointer" }}
                  onClick={() => setShowICalForm(true)}
                >
                  {t("addIcal")}
                </span>
              )}
              <span style={{ color: TB.text2, cursor: "pointer" }}>{t("skipForNow")}</span>
            </div>
          )}
        </>
      }
    >
      <StepDots i={5} />
      <H as="h2" style={{ marginTop: 28, fontSize: 26, textAlign: "center" }}>
        {t("title")}
      </H>
      <div
        style={{
          color: TB.text2,
          fontSize: 14,
          marginTop: 10,
          textAlign: "center",
          maxWidth: 320,
          margin: "10px auto 0",
        }}
      >
        {t("subtitle")}
      </div>

      <div style={{ margin: "36px auto", position: "relative", width: 260, height: 180 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: TB.surface,
            borderRadius: TB.r.lg,
            border: `1px solid ${TB.border}`,
            boxShadow: TB.shadow,
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: `1px solid ${TB.borderSoft}`,
              fontSize: 12,
              color: TB.text2,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Thursday</span>
            <span>Apr 22</span>
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { c: "#3B82F6", t: "Calendar events", time: "8:00" },
              { c: "#EF4444", t: "Routine blocks", time: "9:00" },
              { c: "#22C55E", t: "Care reminders", time: "3:30" },
            ].map((e, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 10px",
                  background: e.c + "14",
                  borderLeft: `3px solid ${e.c}`,
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    fontFamily: TB.fontMono,
                    fontSize: 11,
                    color: TB.text2,
                    width: 34,
                  }}
                >
                  {e.time}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.t}</div>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: -14,
            right: -14,
            background: TB.primary,
            color: "#fff",
            borderRadius: 9999,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 600,
            boxShadow: TB.shadow,
          }}
        >
          {t("eventsAppearHere")}
        </div>
      </div>
    </ObShell>
  );
};

const ObLanding = () => {
  const t = useTranslations("onboarding.landing");
  return (
    <ObShell pad={0}>
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <svg
          style={{ position: "absolute", inset: 0, pointerEvents: "none" } as CSSProperties}
          viewBox="0 0 390 500"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 40 }).map((_, i) => {
            const colors = [
              "#3B82F6",
              "#EF4444",
              "#22C55E",
              "#F59E0B",
              "#8B5CF6",
              "#4F7942",
              "#D4A574",
              "#7FB5B0",
            ];
            const x = (i * 37) % 390;
            const y = 20 + ((i * 23) % 240);
            const r = 3 + (i % 4);
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={r * 2}
                height={r}
                fill={colors[i % colors.length]}
                transform={`rotate(${i * 17} ${x} ${y})`}
                rx="1"
              />
            );
          })}
        </svg>
        <div style={{ padding: "60px 24px 20px", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: TB.primary + "18",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="check" size={36} color={TB.primary} stroke={2.5} />
          </div>
          <H as="h1" style={{ marginTop: 20, fontSize: 30 }}>
            {t("title")}
          </H>
          <div style={{ color: TB.text2, fontSize: 14, marginTop: 6 }}>
            {t("subtitle")}
          </div>
        </div>

        <div style={{ flex: 1, padding: "10px 20px 20px", position: "relative", zIndex: 1 }}>
          <Card pad={14} elevated style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontSize: 12,
                color: TB.text2,
                fontFamily: TB.fontMono,
                letterSpacing: "0.04em",
              }}
            >
              THU · APR 22
            </div>
            {[
              { c: "#3B82F6", t: "Household created" },
              { c: "#EF4444", t: "Adult profile linked" },
              { c: "#22C55E", t: "Roster reviewed" },
              { c: "#F59E0B", t: "Pets kept out of sign-in and wallet flows" },
            ].map((e, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  background: e.c + "14",
                  borderLeft: `3px solid ${e.c}`,
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: e.c,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "0 0 auto",
                  }}
                >
                  <Icon name="check" size={12} stroke={2.5} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{e.t}</div>
              </div>
            ))}
          </Card>
          <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: TB.muted }}>
            {t("opening")}
          </div>
        </div>
      </div>
    </ObShell>
  );
};

export interface OnboardingFormProps {
  householdName?: string;
  setHouseholdName?: (v: string) => void;
  timezone?: string;
  setTimezone?: (v: string) => void;
  selfName?: string;
  setSelfName?: (v: string) => void;
  selfDisplayName?: string;
  setSelfDisplayName?: (v: string) => void;
  selfColor?: string;
  setSelfColor?: (v: string) => void;
  familyMembers?: FamilyMemberDraft[];
  familyDraft?: Omit<FamilyMemberDraft, "id" | "color">;
  setFamilyDraft?: (draft: Omit<FamilyMemberDraft, "id" | "color">) => void;
  addFamilyDraft?: () => void;
  removeFamilyDraft?: (id: string) => void;
  rosterReviewed?: boolean;
  setRosterReviewed?: (checked: boolean) => void;
}

export function Onboarding({
  step = 0,
  householdName = "",
  setHouseholdName = () => {},
  timezone = "",
  setTimezone = () => {},
  selfName = "",
  setSelfName = () => {},
  selfDisplayName = "",
  setSelfDisplayName = () => {},
  selfColor = TB.memberColors[0],
  setSelfColor = () => {},
  familyMembers = [],
  familyDraft = { name: "", display_name: "", role: "adult", age_group: "adult" },
  setFamilyDraft = () => {},
  addFamilyDraft = () => {},
  removeFamilyDraft = () => {},
  rosterReviewed = false,
  setRosterReviewed = () => {},
}: { step?: number } & OnboardingFormProps) {
  switch (step) {
    case 0: return <ObWelcome />;
    case 1: return <ObCreate />;
    case 2: return <ObHousehold householdName={householdName} setHouseholdName={setHouseholdName} timezone={timezone} setTimezone={setTimezone} />;
    case 3: return <ObSelf selfName={selfName} setSelfName={setSelfName} selfDisplayName={selfDisplayName} setSelfDisplayName={setSelfDisplayName} selfColor={selfColor} setSelfColor={setSelfColor} />;
    case 4: return <ObFamily members={familyMembers} draft={familyDraft} setDraft={setFamilyDraft} addDraft={addFamilyDraft} removeDraft={removeFamilyDraft} rosterReviewed={rosterReviewed} setRosterReviewed={setRosterReviewed} />;
    case 5: return <ObCalendar />;
    case 6: return <ObLanding />;
    default: return <ObWelcome />;
  }
}

export const ONBOARDING_LABELS = [
  "Welcome",
  "Create account",
  "Household name",
  "Add self",
  "Add family",
  "Connect calendar",
  "All set!",
];
