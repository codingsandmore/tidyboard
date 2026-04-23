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
  member: FamilyMemberDraft
): Promise<MemberResponse> {
  return api.post<MemberResponse>(`/v1/households/${householdId}/members`, {
    name: member.name,
    display_name: member.display_name,
    role: member.role,
    color: member.color,
  });
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const t = useTranslations();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  // Step 1 state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 state
  const [householdName, setHouseholdName] = useState("");
  const [householdId, setHouseholdId] = useState<string | null>(null);

  // Step 3 state (add self)
  const [selfName, setSelfName] = useState("");
  const [selfDisplayName, setSelfDisplayName] = useState("");
  const [selfColor, setSelfColor] = useState(TB.memberColors[0]);

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
        // Create account
        await register(email || "demo@example.com", password || "placeholder");
      } else if (step === 2) {
        // Create household
        const hh = await createHousehold(householdName || "My Family");
        setHouseholdId(hh.id);
      } else if (step === 3 && householdId) {
        // Add self as adult member
        await addMember(householdId, {
          name: selfName || "Admin",
          display_name: selfDisplayName || selfName || "Admin",
          role: "adult",
          color: selfColor,
        });
      } else if (step === 4 && householdId) {
        // Add any queued family members
        for (const m of familyMembers) {
          await addMember(householdId, m);
        }
      } else if (step === 5) {
        // Google Calendar OAuth — if already connected, advance directly
        if (!calendarConnected) {
          const res = await api.post<{ redirect_url: string }>(
            "/v1/auth/oauth/google/start",
            {}
          );
          // Full-window redirect: Google → callback → /onboarding?step=5&connected=1
          window.location.href = res.redirect_url;
          return; // navigation takes over; don't advance step here
        }
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
        <Onboarding step={step} />

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
