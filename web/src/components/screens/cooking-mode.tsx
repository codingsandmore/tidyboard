"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TB } from "@/lib/tokens";
import { useRecipe } from "@/lib/api/hooks";
import { H } from "@/components/ui/heading";
import { Btn } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Recipe } from "@/lib/data";

// ── Cooking-mode dark-overlay palette ──────────────────────────────────────
// Cooking mode is intentionally darker than the standard `TB.dBg` so the
// kitchen UI feels low-glare. These overlays are derived from `TB.dText`
// (white-ish foreground) so dark-mode token swaps cascade naturally.
const COOK_BG = TB.dBg;          // page background
const COOK_BG_EMPTY = TB.dBg2;   // "no steps" empty-state background
const COOK_FG = TB.dText;        // primary foreground
const COOK_FG_DIM = TB.dText2;   // dimmed foreground (subtitles, mono)
const COOK_OVERLAY_4 = "rgba(250,250,249,0.04)";  // disabled chip
const COOK_OVERLAY_8 = "rgba(250,250,249,0.08)";  // top/bottom-bar borders
const COOK_OVERLAY_10 = "rgba(250,250,249,0.10)"; // top-bar progress track
const COOK_OVERLAY_12 = "rgba(250,250,249,0.12)"; // step counter chip
const COOK_OVERLAY_15 = "rgba(250,250,249,0.15)"; // prev-button border
const COOK_OVERLAY_30 = "rgba(250,250,249,0.30)"; // disabled text
const COOK_OVERLAY_50 = "rgba(250,250,249,0.50)"; // recipe title caption
const COOK_OVERLAY_60 = "rgba(250,250,249,0.60)"; // empty-state body

// ── Wake lock helpers ──────────────────────────────────────────────────────

function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported("wakeLock" in navigator);
  }, []);

  const acquire = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      lockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // Wake lock not granted — non-fatal; screen may dim but cooking continues.
    }
  }, []);

  const release = useCallback(async () => {
    if (lockRef.current) {
      try {
        await lockRef.current.release();
      } catch {
        // ignore
      }
      lockRef.current = null;
    }
  }, []);

  return { acquire, release, supported };
}

// ── Step timer ─────────────────────────────────────────────────────────────

function StepTimer({
  seconds,
  onDone,
}: {
  seconds: number;
  onDone?: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          onDone?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, onDone]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = `${mins}:${String(secs).padStart(2, "0")}`;
  const pct = seconds > 0 ? (remaining / seconds) * 100 : 0;

  return (
    <div
      data-testid="step-timer"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        marginTop: 16,
      }}
    >
      {/* Circular progress */}
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke={TB.border} strokeWidth="5" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke={remaining === 0 ? TB.success : TB.primary}
            strokeWidth="5"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: TB.fontDisplay,
            fontWeight: 700,
            fontSize: 16,
            color: remaining === 0 ? TB.success : TB.text,
          }}
        >
          {remaining === 0 ? "Done!" : label}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {!running && remaining > 0 && (
          <button
            data-testid="timer-start"
            onClick={() => setRunning(true)}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              background: TB.primary,
              color: TB.primaryFg,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Start timer
          </button>
        )}
        {running && (
          <button
            data-testid="timer-pause"
            onClick={() => setRunning(false)}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              background: TB.muted,
              color: TB.primaryFg,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Pause
          </button>
        )}
        {remaining !== seconds && (
          <button
            data-testid="timer-reset"
            onClick={() => { setRemaining(seconds); setRunning(false); }}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "transparent",
              color: TB.text2,
              border: `1px solid ${TB.border}`,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main cooking mode component ────────────────────────────────────────────

export function CookingMode({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const { data: recipe } = useRecipe(recipeId);
  const [stepIdx, setStepIdx] = useState(0);
  const [timerDone, setTimerDone] = useState(false);
  const { acquire, release, supported } = useWakeLock();

  // Acquire wake lock when entering cooking mode.
  useEffect(() => {
    acquire();
    return () => { release(); };
  }, [acquire, release]);

  // Reset timer-done flag when step changes.
  useEffect(() => {
    setTimerDone(false);
  }, [stepIdx]);

  const steps = (recipe as Recipe & { steps?: string[] })?.steps ?? [];
  const totalSteps = steps.length;
  const currentStep = steps[stepIdx] ?? "";
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === totalSteps - 1;

  // Extract optional timer from step text (pattern: "N min" or "N minutes").
  const timerSeconds = (() => {
    const match = currentStep.match(/\b(\d+)\s*min(?:utes?)?\b/i);
    if (match) return parseInt(match[1], 10) * 60;
    return null;
  })();

  if (!recipe) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COOK_BG,
          color: COOK_FG,
          fontFamily: TB.fontBody,
          flexDirection: "column",
          gap: 16,
        }}
      >
        <H as="h2" style={{ color: COOK_FG }}>Loading recipe…</H>
      </div>
    );
  }

  if (totalSteps === 0) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COOK_BG_EMPTY,
          color: COOK_FG,
          fontFamily: TB.fontBody,
          flexDirection: "column",
          gap: 16,
          padding: 32,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48 }}>🍽️</div>
        <H as="h2" style={{ color: COOK_FG, fontSize: 28 }}>{(recipe as Recipe).title}</H>
        <p style={{ color: COOK_OVERLAY_60, fontSize: 16, maxWidth: 400 }}>
          This recipe has no step-by-step instructions yet.
        </p>
        <Btn kind="secondary" size="lg" onClick={() => router.back()}>
          Back to recipe
        </Btn>
      </div>
    );
  }

  return (
    <div
      data-testid="cooking-mode"
      style={{
        width: "100vw",
        height: "100vh",
        background: COOK_BG,
        color: COOK_FG,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${COOK_OVERLAY_8}`,
          flexShrink: 0,
        }}
      >
        <button
          data-testid="cook-close"
          onClick={() => router.back()}
          style={{
            background: COOK_OVERLAY_10,
            border: "none",
            borderRadius: 8,
            padding: "6px 14px",
            color: COOK_FG,
            cursor: "pointer",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="chevronL" size={16} color={COOK_FG} />
          Exit
        </button>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 12,
              color: COOK_OVERLAY_50,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {(recipe as Recipe).title}
          </div>
          {supported && (
            <div
              style={{ fontSize: 10, color: COOK_OVERLAY_30, marginTop: 2 }}
            >
              Screen kept awake
            </div>
          )}
        </div>

        {/* Step counter */}
        <div
          data-testid="step-counter"
          style={{
            background: COOK_OVERLAY_12,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {stepIdx + 1} / {totalSteps}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 3,
          background: COOK_OVERLAY_10,
          flexShrink: 0,
        }}
      >
        <div
          data-testid="progress-bar"
          style={{
            height: "100%",
            width: `${((stepIdx + 1) / totalSteps) * 100}%`,
            background: TB.primary,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Step content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 40px",
          overflow: "auto",
        }}
      >
        {/* Step number badge */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: TB.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: TB.fontDisplay,
            fontWeight: 700,
            fontSize: 24,
            marginBottom: 28,
            flexShrink: 0,
          }}
        >
          {stepIdx + 1}
        </div>

        {/* Step text — large for readability across the kitchen */}
        <p
          data-testid="step-text"
          style={{
            fontSize: "clamp(20px, 3.5vw, 32px)",
            lineHeight: 1.6,
            textAlign: "center",
            maxWidth: 700,
            margin: 0,
            color: COOK_FG,
          }}
        >
          {currentStep}
        </p>

        {/* Optional step timer */}
        {timerSeconds !== null && timerSeconds > 0 && (
          <StepTimer
            seconds={timerSeconds}
            onDone={() => setTimerDone(true)}
          />
        )}

        {timerDone && (
          <div
            data-testid="timer-done-badge"
            style={{
              marginTop: 12,
              padding: "6px 18px",
              borderRadius: 20,
              background: TB.success,
              color: TB.primaryFg,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Timer done!
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div
        style={{
          padding: "20px 32px",
          borderTop: `1px solid ${COOK_OVERLAY_8}`,
          display: "flex",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <button
          data-testid="cook-prev"
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={isFirst}
          style={{
            flex: 1,
            padding: "16px 0",
            borderRadius: 14,
            border: `1px solid ${COOK_OVERLAY_15}`,
            background: isFirst ? COOK_OVERLAY_4 : COOK_OVERLAY_10,
            color: isFirst ? COOK_OVERLAY_30 : COOK_FG,
            fontSize: 16,
            fontWeight: 600,
            cursor: isFirst ? "not-allowed" : "pointer",
            fontFamily: TB.fontBody,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Icon name="chevronL" size={20} color={isFirst ? COOK_OVERLAY_30 : COOK_FG} />
          Previous
        </button>

        {isLast ? (
          <button
            data-testid="cook-finish"
            onClick={() => router.back()}
            style={{
              flex: 2,
              padding: "16px 0",
              borderRadius: 14,
              border: "none",
              background: TB.success,
              color: TB.primaryFg,
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: TB.fontBody,
            }}
          >
            Done! 🎉
          </button>
        ) : (
          <button
            data-testid="cook-next"
            onClick={() => setStepIdx((i) => Math.min(totalSteps - 1, i + 1))}
            style={{
              flex: 2,
              padding: "16px 0",
              borderRadius: 14,
              border: "none",
              background: TB.primary,
              color: TB.primaryFg,
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: TB.fontBody,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            Next step
            <Icon name="chevronR" size={20} color={COOK_FG} />
          </button>
        )}
      </div>
    </div>
  );
}
