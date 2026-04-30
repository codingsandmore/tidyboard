"use client";

// TODO(i18n): strings extracted — this is the reference migration screen.
// Remaining untranslated string: ONBOARDING_LABELS (step labels from @/components/screens/onboarding).

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { TB } from "@/lib/tokens";
import { Onboarding, ONBOARDING_LABELS } from "@/components/screens/onboarding";
import { useAuth } from "@/lib/auth/auth-store";
import { api } from "@/lib/api/client";
import { isApiFallbackMode } from "@/lib/api/fallback";
import { useSearchParams } from "next/navigation";

const TOTAL = 7;

// ── Types ──────────────────────────────────────────────────────────────────

interface FamilyMemberDraft {
  name: string;
  display_name: string;
  role: "adult" | "child";
  color: string;
  pin?: string;
}

// ── Network helpers ────────────────────────────────────────────────────────

interface HouseholdResponse {
  id: string;
  name: string;
}

interface MemberResponse {
  id: string;
  name: string;
}

async function createHousehold(name: string): Promise<HouseholdResponse> {
  return api.post<HouseholdResponse>("/v1/households", { name });
}

async function addMember(
  householdId: string,
  member: FamilyMemberDraft,
  accountId?: string
): Promise<MemberResponse> {
  return api.post<MemberResponse>(`/v1/households/${householdId}/members`, {
    name: member.name,
    display_name: member.display_name,
    role: member.role,
    color: member.color,
    ...(accountId ? { account_id: accountId } : {}),
  });
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: authStatus, account } = useAuth();
  const t = useTranslations();

  // Onboarding requires a signed-in Cognito user — sign-up + email/password is
  // owned by Cognito's Hosted UI, not this page. Redirect unauthenticated users
  // to /login with the return-to set so they land back here.
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace(`/login?returnTo=${encodeURIComponent("/onboarding")}`);
    }
  }, [authStatus, router]);

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  // Step 1 (account) is fulfilled by Cognito sign-in before the user reaches
  // this page. The email below is read from the Cognito-hydrated auth context
  // so we can display it as confirmation (no edit, no submit).
  const email = account?.email ?? "";

  // Step 2 state
  const [householdName, setHouseholdName] = useState("");
  const [householdId, setHouseholdId] = useState<string | null>(null);

  // Step 3 state (add self)
  const [selfName, setSelfName] = useState("");
  const [selfDisplayName, setSelfDisplayName] = useState("");
  const [selfColor, setSelfColor] = useState<string>(TB.memberColors[0]);

  // Step 4 state (family members)
  const [familyMembers] = useState<FamilyMemberDraft[]>([]);

  // Auto-redirect on step 6 (landing)
  useEffect(() => {
    if (step === 6) {
      const timer = setTimeout(() => router.push("/"), 2000);
      return () => clearTimeout(timer);
    }
  }, [step, router]);

  // Detect return from Google OAuth callback (?step=5&connected=1)
  useEffect(() => {
    const paramStep = searchParams.get("step");
    const connected = searchParams.get("connected");
    if (paramStep === "5" && connected === "1") {
      setCalendarConnected(true);
      setStep(5);
    }
  }, [searchParams]);

  async function advance() {
    setError(null);

    // In fallback/demo mode, skip all network calls
    if (isApiFallbackMode()) {
      if (step < TOTAL - 1) setStep(step + 1);
      else router.push("/");
      return;
    }

    setLoading(true);
    try {
      if (step === 1) {
        // Account already exists — Cognito created it on first sign-in and
        // the auth middleware populated /v1/auth/me. Nothing to do here;
        // step 1 is now just a "you're signed in as X" confirmation.
      } else if (step === 2) {
        // Create household
        const hh = await createHousehold(householdName);
        setHouseholdId(hh.id);
      } else if (step === 3 && householdId) {
        // Add self as adult member, linking to the signed-in account so
        // /v1/auth/me can resolve household_id + member_id after onboarding.
        await addMember(
          householdId,
          {
            name: selfName,
            display_name: selfDisplayName || selfName,
            role: "adult",
            color: selfColor,
          },
          account?.id
        );
      } else if (step === 4 && householdId) {
        // Add any queued family members
        for (const m of familyMembers) {
          await addMember(householdId, m);
        }
      } else if (step === 5) {
        // Google Calendar OAuth used to live here (separate scope from the
        // sign-in OAuth Cognito federates). Disabled for now — users can add
        // an iCal URL from Settings → Calendars to subscribe to a calendar
        // without read-only Google integration. A scoped Google Calendar
        // OAuth flow is a future enhancement and not blocking onboarding.
      }
      // Steps 0, 5 (calendar — skip network or already connected), 6 (landing) advance directly
      if (step < TOTAL - 1) setStep(step + 1);
      else router.push("/");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const back = () => {
    setError(null);
    if (step > 0) setStep(step - 1);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: TB.bg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Max-phone-width content column centered on larger screens */}
      <div
        style={{
          flex: 1,
          margin: "0 auto",
          width: "100%",
          maxWidth: 480,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 0 0 1px rgba(0,0,0,.03)",
        }}
      >
        <Onboarding
          step={step}
          householdName={householdName}
          setHouseholdName={setHouseholdName}
          selfName={selfName}
          setSelfName={setSelfName}
          selfDisplayName={selfDisplayName}
          setSelfDisplayName={setSelfDisplayName}
          selfColor={selfColor}
          setSelfColor={setSelfColor}
        />

        {/* Step 2: "Join instead" alternative path */}
        {step === 2 && (
          <div
            style={{
              position: "absolute",
              bottom: 84,
              left: 16,
              right: 16,
              textAlign: "center",
              fontFamily: TB.fontBody,
              fontSize: 13,
              color: TB.text2,
              zIndex: 5,
            }}
          >
            Already have a code?{" "}
            <a
              href="/join"
              style={{ color: TB.primary, textDecoration: "underline", fontWeight: 600 }}
            >
              Join an existing household
            </a>
          </div>
        )}

        {/* Error overlay — shown above the visual step */}
        {error && (
          <div
            role="alert"
            style={{
              position: "absolute",
              top: 12,
              left: 16,
              right: 16,
              background: TB.destructive + "14",
              border: `1px solid ${TB.destructive}`,
              borderRadius: TB.r.md,
              padding: "10px 14px",
              fontSize: 13,
              color: TB.destructive,
              zIndex: 10,
              fontFamily: TB.fontBody,
            }}
          >
            {error}
          </div>
        )}

        {/* Invisible full-cover overlay that captures click on the footer
            button. The footer button text is fixed in the design, so we
            advance the wizard on any pointer-up in the footer region. */}
        <button
          onClick={advance}
          disabled={loading}
          aria-label={`Continue from ${ONBOARDING_LABELS[step]}`}
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
            height: 56,
            background: "transparent",
            border: "none",
            cursor: loading ? "wait" : "pointer",
          }}
        />
      </div>
      {/* Dev breadcrumb for navigation — tiny, unobtrusive */}
      <div
        style={{
          padding: "10px 16px",
          background: TB.surface,
          borderTop: `1px solid ${TB.borderSoft}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 12,
          color: TB.text2,
        }}
      >
        <button
          onClick={back}
          disabled={step === 0}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: `1px solid ${TB.border}`,
            background: step === 0 ? TB.bg2 : TB.surface,
            color: step === 0 ? TB.muted : TB.text,
            cursor: step === 0 ? "not-allowed" : "pointer",
            fontFamily: TB.fontBody,
            fontSize: 12,
          }}
        >
          {t("common.back")}
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          Step {step + 1} / {TOTAL} · {ONBOARDING_LABELS[step]}
        </div>
        <button
          onClick={advance}
          disabled={loading}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: `1px solid ${TB.primary}`,
            background: TB.primary,
            color: "#fff",
            cursor: loading ? "wait" : "pointer",
            fontFamily: TB.fontBody,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {loading ? "…" : step === TOTAL - 1 ? t("common.finish") : t("common.next")}
        </button>
      </div>
    </div>
  );
}
